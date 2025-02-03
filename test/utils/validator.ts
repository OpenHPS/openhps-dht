// The purpose of this script is to determine the average number of
// positioning systems that one single node can have. To do this, we
// perform an overpass query on OpenStreetMap to return the average
// number of buildings in the configured grid size. We then assume
// that in a *best case* (worst case) scenario, each building has a
// positioning system.

import fetch from 'node-fetch';
import ProgressBar from 'progress';

const GRID_SIZE = 10; // km
// For querying
const queryBoundingBox = { minLat: 49.5, maxLat: 51.5, minLon: 2.5, maxLon: 6.5 };

function getBoundingBox(latitude: number, longitude: number) {
    // Partition the globe into partitions
    const partition = GRID_SIZE / 111.132954; // km in degrees
    // Split the coordinates into partitions
    const latPartition = Math.floor(latitude / partition);
    const lonPartition = Math.floor(longitude / partition);
    // Calculate the bounding box
    const minLat = Math.max(-90, latPartition * partition);
    const maxLat = Math.min(90, minLat + partition);
    const minLon = Math.max(-180, lonPartition * partition);
    const maxLon = Math.min(180, minLon + partition);

    return { minLat, maxLat, minLon, maxLon };
}

async function validate() {
    const totalQueries = Math.ceil(((queryBoundingBox.maxLat - queryBoundingBox.minLat) / (GRID_SIZE / 111.132954)) * ((queryBoundingBox.maxLon - queryBoundingBox.minLon) / (GRID_SIZE / 111.132954)));
    let count = 0;
    let maxBuildings = 0;
    console.log(`Total queries (in bounding box): ${totalQueries}`);
    const bar = new ProgressBar('[:bar] :percent :etas', { total: totalQueries });
    // Limit the queries to those in bounding box
    for (let lat = queryBoundingBox.minLat; lat < queryBoundingBox.maxLat; lat += GRID_SIZE / 111.132954) {
        for (let lon = queryBoundingBox.minLon; lon < queryBoundingBox.maxLon; lon += GRID_SIZE / (111.132954 * Math.cos((Math.PI * lat) / 180))) {
            const boundingBox = getBoundingBox(lat, lon);
            const query = `
            [out:json];
            (
                way["building"~"public|government|school|university|college|hospital|clinic|fire_station|police|library|civic"](${boundingBox.minLat.toFixed(6)},${boundingBox.minLon.toFixed(6)},${boundingBox.maxLat.toFixed(6)},${boundingBox.maxLon.toFixed(6)});
            );
            out count;
            `;
            // Execute the query
            async function executeQuery(query: string) {
                const url = 'https://overpass-api.de/api/interpreter';
                const response = await fetch(url, {
                    method: 'POST',
                    body: "data=" + encodeURIComponent(query)
                });
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    const data = await response.json();
                    return data;
                } else {
                    throw new Error('Response is not JSON');
                }
            }
            bar.tick();
            const data: any = await executeQuery(query);
            count += parseInt(data.elements[0].tags.total);
            maxBuildings = Math.max(maxBuildings, parseInt(data.elements[0].tags.total));
        }
    }    
    // Average
    const average = Math.ceil(count / totalQueries);
    console.log(`\nAverage number of buildings in a ${GRID_SIZE}km grid: ${average.toLocaleString()}`);
    console.log(`Max number of buildings in a ${GRID_SIZE}km grid: ${maxBuildings.toLocaleString()}`);
}

validate();
