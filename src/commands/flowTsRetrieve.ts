// import {
//     getDefaultDevHubUsernameOrAlias
// } from '../util';

async function getDefaultDevHubUsernameOrAlias(): Promise<string> {
    return 'test';
}

export async function flowTsRetrieve(this: unknown) {
    const username = await getDefaultDevHubUsernameOrAlias();
    console.log('flowTsRetrieve: ' + username);
}
