export default class ClientNotReadyError extends Error {
    constructor(details) {
        super(`The client is not ready to perform this action.\n\nTip: ${details}`);
    }
}
