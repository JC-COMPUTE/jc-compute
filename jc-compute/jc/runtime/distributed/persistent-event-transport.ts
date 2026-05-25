import fs from 'fs';

export class PersistentEventTransport {
  private logfile = './runtime-events.log';

  append(event: string) {
    fs.appendFileSync(this.logfile, event + '\n');
  }

  replay() {
    return fs.readFileSync(this.logfile, 'utf8')
      .split('\n')
      .filter(Boolean);
  }
}
