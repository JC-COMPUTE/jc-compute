const crypto = require('crypto');

function canonicalize(history) {
  return JSON.stringify(
    [...history].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    )
  );
}

function replayHash(history) {
  return crypto
    .createHash('sha256')
    .update(canonicalize(history))
    .digest('hex');
}

function certifyReplayEquivalence(historyA, historyB) {
  const hashA = replayHash(historyA);
  const hashB = replayHash(historyB);

  return {
    equivalent: hashA === hashB,
    hashA,
    hashB,
    certified: hashA === hashB
  };
}

module.exports = {
  replayHash,
  certifyReplayEquivalence
};
