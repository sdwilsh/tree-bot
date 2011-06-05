var kCharactersPerSecond = 5.25;
var kMillisecondsPerSecond = 1000;
var queue = [];
var lastMessageSent = Date.now();
var timerId;

function enqueueCallback(delay, cb, args) {
  queue.push({
    delay: delay,
    cb: cb,
    args:args
  });
  if (queue.length == 1) {
    // There's no timer running so schedule us to send the message as soon as we can.
    timerId = setTimeout(runQueueHead, delay);
  }
}

function runQueueHead() {
  var item = queue.shift();
  item.cb.apply(null, item.args);
  lastMessageSent = Date.now();
  if (queue.length > 0) {
    // Set up the next one in the queue
    timerId = setTimeout(runQueueHead, queue[0].delay);
  }
}

exports.type = function (cb) {
  return function (format) {
    enqueueCallback(kMillisecondsPerSecond * format.length / kCharactersPerSecond, cb, arguments);
  };
};
