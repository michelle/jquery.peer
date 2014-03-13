
(function($) {

  // Compatibility
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // IDs of connections on this page to peer objs, which we'll exclude when
  // listing possible peers.
  var peerIdentifiers = {};

  function Connection($el, options) {
    this.options = options;
    this.room = options.room;
    this.id = options.id;
    this.type = options.type;
    this.internalId = options.type + '-' + (this.room ? this.room + '-' : '') + this.id;

    this.isMedia = options.type === 'media';
    this.$el = $el;

    if (this.isMedia) {
      // Create local stream.
      this._createStream();
      this._constructMediaElements(options.hideAllDisplays, options.hideOwnVideo);
    } else {
      // ?
    }
    this._setupHandlers()

    this._createPeer();
  };

  Connection.prototype._setupHandlers = function() {
    var self = this;
    this.$el.on('click', '.peer-buddy', function() {
      self.call($(this).text());
    });
  };

  Connection.prototype._createPeer = function() {
    // TODO(later): switch to a different key for tracking purposes.
    this.peer = new Peer(this.internalId + (this.idOffset ? this.idOffset : ''), {key: 'lwjd5qra8257b9', debug: true});

    var self = this;
    this.peer.on('error', function(err) {
      self._handleError(err);
    });

    this.peer.on('open', function(id) {
      self.internalId = id;
      self.id = id.split('-').pop();
      self.ready = true;
      self._refreshBuddyList();

      peerIdentifiers[self.internalId] = 1;

      if (typeof self.pendingCall !== 'undefined') {
        self._startCall(self.pendingCall);
      }
    });

    if (this.isMedia) {
      this.peer.on('call', function(remoteCall) {
        self._maybeAnswerCall(remoteCall);
      });
    } else {
      // ?
    }
  };

  Connection.prototype._maybeAnswerCall = function(remoteCall) {
    if (!this.inCall) {
      // emit call so they can answer?
      if (this.options.manualCalls) {
      } else {
        this.call = remoteCall;
        this._setupCallHandlers();
        this.call.answer(this.stream);
      }
    }
    // Otherwise, let it time out on the other side.
  };

  Connection.prototype._createStream = function() {
    var self = this;
    navigator.getUserMedia({audio: true, video: true}, function(stream) {
      self.stream = stream;

      if (!self.options.hideOwnVideo) {
        self.$localVideo.prop('src', URL.createObjectURL(stream));
      }

      if (typeof self.pendingCall !== 'undefined') {
        self._startCall(self.pendingCall);
      }
    });
  };

  Connection.prototype._handleError = function(err) {
    if (['invalid-id', 'browser-incompatible'].indexOf(err.type) !== -1) {
      throw err;
    } else if (err.type === 'unavailable-id') {
      // Keep trying IDs until we find an untaken.
      // We can do this smarter once we implement listAvailablePeers() in
      // PeerJS.
      this.idOffset = this.idOffset || 0;
      this.idOffset += 1;
      this._createPeer();
    } else if (!err.type) {
      throw err;
    } else {
      // Basically 500 for all other error types.
      var errorMessage = 'Oops. Something went wrong internally! :(: ' + err;
      this._showNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  };

  Connection.prototype._startCall = function(peerId) {
    // Maybe we don't want to do this?
    // Chatroulette style!
    if (this.inCall && typeof this.pendingCall !== 'undefined') {
      this._cancelCall();
    }


    var self = this;
    if (this.isMedia) {
      this.inCall = true;

      // TODO: wait for local stream? Can we not?
      if (!this.ready || !this.stream) {
        this.pendingCall = peerId;
        return;
      }

      this.pendingCall = undefined;
      this.call = this.peer.call(peerId, this.stream);
      this._setupCallHandlers();
      setTimeout(this._cancelCall.bind(this), this.options.callTimeout || 30000)
    } else {
      // ?
    }
  };

  Connection.prototype._setupCallHandlers = function() {
    var self = this;
    this.call.on('stream', function(stream) {
      self._showNotification('Connected to ' + self.peerId + '!');
      self.$remoteVideo.prop('src', URL.createObjectURL(stream));
    });
    this.call.on('error', function(err) {
      self._showNotification(err, 'error');
      throw err;
    });
    // TODO(NOW): on close/disconnect!
  };

  Connection.prototype._cancelCall = function() {
    this.inCall = false;
    this.pendingCall = undefined;
    if (this.call) {
      this.call.close();
      self._showNotification('Ended call with ' + this.peerId + '.');
    }
  };

  Connection.prototype._checkPeerType = function(type) {
    if (type && this.type !== type) {
      // TODO(later): link to documentation or something nice..
      throw new Error('Whoops! This element supports ' + this.type
          + ' but you are trying to make a ' + type + ' connection.');
    }
  };

  Connection.prototype.call = function(identifier) {
    this._checkPeerType('media');

    this.peerId = identifier;

    if (this.room) {
      identifier = this.room + '-' + identifier;
    }
    identifier = 'media-' + identifier;

    this._startCall(identifier);
  };

  Connection.prototype.availablePeers = function(cb) {
    if (!this.peer) {
      cb([]);
      return;
    }

    try {
      var self = this;

      this.peer.listAllPeers(function(res) {
        var diff = [];

        for (var i = 0, ii = res.length; i < ii; i += 1) {
          var id = res[i];

          // Only list peers not on this page, of the same type, and with the
          // same room.
          if (!peerIdentifiers[id] && id.indexOf(self.type + '-') === 0 && (!self.room || id.indexOf(self.room) === self.type.length + 1)) {
            diff.push(res[i].split('-').pop());
          }
        }
        cb(diff);
      });
    } catch (e) {
      cb([]);
    }
  };


  // DOM helpers.
  Connection.prototype._constructMediaElements = function(hideAllDisplays, hideOwnVideo) {
    if (!hideOwnVideo) {
      this.$localVideo = $('<video autoplay>');
      this.$localVideo.addClass('peer-video-local');
      this.$localVideo.attr('muted', 'true');
      this.$el.append(this.$localVideo);
    }

    this.$remoteVideo = $('<video autoplay>');
    this.$remoteVideo.addClass('peer-video-remote');
    this.$el.append(this.$remoteVideo);

    if (!hideAllDisplays) {
      this.$buddyList = $('<div>');
      this.$buddyList.addClass('peer-buddy-list');
      this.$el.append(this.$buddyList);

      this.$notifications = $('<div>');
      this._resetNotification();
      this.$el.append(this.$notifications);
    }
  };

  Connection.prototype._refreshBuddyList = function() {
    if (this.options.hideAllDisplays) {
      return;
    }

    var self = this;
    this.availablePeers(function(peers) {
      peers.forEach(function(peer) {
        var $buddy = $('<div>');
        $buddy.attr('class', 'peer-buddy');
        $buddy.text(peer);
        self.$buddyList.append($buddy);
      });

      // Set timeout to repull buddy list.
      // TODO: peerjs should probably push buddies.
      setTimeout(self._refreshBuddyList.bind(self), 30000);
    });
  };

  Connection.prototype._showNotification = function(message, type) {
    if (this.options.hideAllDisplays) {
      return;
    }

    this.$notifications.text(message);
    this.$notifications.removeClass('peer-hidden');
    if (type) {
      this.$notifications.addClass('peer-' + type);
    }
  };

  Connection.prototype._resetNotification = function() {
    if (this.options.hideAllDisplays) {
      return;
    }

    this.$notifications.attr('class', 'peer-notification peer-hidden');
    this.$notifications.text('');
  };

  // Utilities!
  $.peer = {
  };

  // Make an element a peer!
  $.fn.peer = function(options, callback) {
    // Check if PeerJS is imported.
    if (!window.Peer) {
      throw new Error('You need to import PeerJS in order to use jquery.peer. Try putting this in your HTML: `<script type="text/javascript" src="http://cdn.peerjs.com/latest/peer.js"></script>`');
    }

    // TODO: maybe this is unnecessary.
    if (this.length !== 1) {
      throw new Error('You may select exactly one element. Currently ' + this.length + ' element(s) are selected.');
    }

    var instance = $.data(this, 'connection');

    // This is a method call.
    // Method borrowed from isotope :)
    if (typeof options === 'string') {
      var method = options;
      var args = Array.prototype.slice.call(arguments, 1);

      if (!instance) {
        throw new Error('You first have to initialize jquery.peer by calling'
            + ' $(element).peer([options]) on this element.');
      }
      if (typeof instance[method] !== 'function' || method[0] === '_' || method[0] === '$') {
        throw new Error('Method ' + method + ' not found.');
      }
      instance[method].apply(instance, args);
    } else {
      if (instance) {
        throw new Error('This element has already been initialized.');
      }

      // Maybe this is unnecessary and we don't even want rooms?
      if (options.room && options.room.indexOf('-') !== -1) {
        throw new Error('ID must be alphanumeric.');
      }

      if (options.id.indexOf('-') !== -1) {
        throw new Error('ID must be alphanumeric.');
      }

      options.type = $(this).is('form') ? 'data' : 'media';
      var connection = new Connection(this, options);
      $.data(this, 'connection', connection);
    }

    return this;
  };



})(jQuery);
