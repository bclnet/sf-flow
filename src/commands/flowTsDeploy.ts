// import {
//     getDefaultDevHubUsernameOrAlias
// } from '../util';

async function getDefaultDevHubUsernameOrAlias(): Promise<string> {
    return 'test';
}

export async function flowTsDeploy(this: unknown) {
    const username = await getDefaultDevHubUsernameOrAlias();
    console.log('flowTsDeploy: ' + username);
}
