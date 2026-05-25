export class TemporalCognition {
  reconstruct(history: string[]) {
    return history.map((event, index) => ({
      index,
      event,
    }));
  }
}
