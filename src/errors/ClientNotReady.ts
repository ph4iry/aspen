export default class ClientNotReadyError extends Error {
  constructor(details: string) {
    super(`The client is not ready to perform this action.\n\nTip: ${details}`);
  }
}