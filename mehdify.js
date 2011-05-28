var replace_dict = { 'awesome': 'awesome/terrible',
                     'terrible': 'awesome/terrible',
                     'best': 'best/worst',
                     'worst': 'best/worst',
                     'better': 'better/worse',
                     'worse': 'better/worse',
                     'love': 'love/hate',
                     'hate': 'love/hate'};

function randint(a,b) {
  return a + parseInt((1 + b - a) * Math.random(), 10);
}

module.exports = function (status, callback) {
  // replace some adjectives
  words = status.split(' ')
  words.forEach(function (word) {
    if (word in replace_dict) {
      status = status.replace(word, replace_dict[word])
    }
  });

  // add ", bro" to @replies
  if (status[0] === '@') {
    callback(status.replace(/([?!,.]*$)/, ', bro'))
  }
  // try and determine if the tweet asks a question
  else if (/\?.{0,4}$/.test(status)) {
    callback('u' + 'hhhhhh'.substring(randint(0,5)) + ' ' + status)
  }
  // prepend "aww yeah" or "whoa" to some tweets
  else if (Math.random() > 0.5) {
    callback('aww yeah, ' + status);
  }
  else {
    callback('whoa, ' + status)
  }
};
