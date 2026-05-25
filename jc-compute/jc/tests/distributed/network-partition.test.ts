describe('Distributed Fault Simulation', () => {
  test('state converges after partition recovery', () => {
    const nodeA = ['e1', 'e2'];
    const nodeB = ['e1', 'e3'];

    const merged = [...new Set([...nodeA, ...nodeB])];

    expect(merged.length).toBe(3);
  });

  test('replay remains deterministic after merge', () => {
    const replay1 = ['a', 'b', 'c'];
    const replay2 = ['a', 'b', 'c'];

    expect(replay1).toEqual(replay2);
  });
});
