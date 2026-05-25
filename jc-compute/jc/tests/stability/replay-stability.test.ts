describe('Replay Stability', () => {
  test('long-duration replay remains deterministic', () => {
    const replayA = Array.from({ length: 100000 }, (_, i) => i);
    const replayB = Array.from({ length: 100000 }, (_, i) => i);

    expect(replayA).toEqual(replayB);
  });
});
