/**
 * Check whether a Community Solid Server is listening at the provided base URL.
 *
 * The integration suites need the docker-compose stack (three Solid pods on ports
 * 3000-3002). When it is not running the specs are skipped instead of failing, so
 * `npm test` stays usable on a machine without the stack.
 * @param {string} uri Base URL of the Solid server
 * @param {number} timeout Deadline in milliseconds
 * @returns {Promise<boolean>} Promise resolving to true when the server responds
 */
export function isPodAvailable(uri: string, timeout = 2000): Promise<boolean> {
    let timer: NodeJS.Timeout;
    const deadline = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeout);
        timer.unref();
    });
    const probe = fetch(`${uri}/.account/`)
        .then((response) => response.ok)
        .catch(() => false);
    return Promise.race([probe, deadline]).finally(() => clearTimeout(timer));
}

export function generate(
    uri: string,
    pod: string,
    email: string,
    password: string,
): Promise<{ id: string; secret: string; resource: string }> {
    return new Promise((resolve, reject) => {
        let accountToken: string;
        const tokenName = 'my-token';
        fetch(`${uri}/.account/`)
            .then((response) => {
                return response.json();
            })
            .then(({ controls }) => {
                return fetch(controls.password.login, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email, password, name: tokenName }),
                });
            })
            .then((response) => {
                return response.json();
            })
            .then(({ authorization }) => {
                accountToken = authorization;
                return fetch(`${uri}/.account/`, {
                    headers: { authorization: `CSS-Account-Token ${accountToken}` },
                });
            })
            .then((response) => {
                return response.json();
            })
            .then(({ controls }) => {
                return fetch(controls.account.clientCredentials, {
                    method: 'POST',
                    headers: { authorization: `CSS-Account-Token ${accountToken}`, 'content-type': 'application/json' },
                    body: JSON.stringify({ name: tokenName, webId: `${uri}/${pod}/profile/card#me` }),
                });
            })
            .then((response) => {
                return response.json();
            })
            .then(resolve)
            .catch(reject);
    });
}
