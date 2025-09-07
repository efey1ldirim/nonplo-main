declare global {
  var broadcastToUser: ((userId: string, type: string, data: any) => void) | undefined;
}

export {};