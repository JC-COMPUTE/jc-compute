import net from 'net';

export class DistributedNode {
  constructor(
    public id: string,
    public port: number
  ) {}

  start() {
    const server = net.createServer((socket) => {
      socket.on('data', (data) => {
        console.log(`[${this.id}] received:`, data.toString());
      });
    });

    server.listen(this.port, () => {
      console.log(`[${this.id}] active on port ${this.port}`);
    });
  }
}
