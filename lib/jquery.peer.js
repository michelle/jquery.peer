
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
    this.$el = $('<div>');
    this.$el.addClass('peer-container');
    this.$parent = $el;
    $el.append(this.$el);

    this._constructCommonElements();
    if (this.isMedia) {
      // Create local stream.
      this._createStream();
      this._constructMediaElements();
    } else {
      //this._constructDataElements();
      // ?
    }

    this._setupHandlers()

    this._createPeer();
  };

  Connection.prototype._setupHandlers = function() {
    var self = this;
    this.$el.on('click', '.peer-buddy', function() {
      var peer = $(this).text();
      if (self.isMedia) {
        self.call(peer);
      } else {
        self.connect(peer);
      }
    });
    this.$el.on('click', '.peer-end-call', function() {
      if (self.isMedia) {
        self.endCall();
      } else {
        self.endConnection();
      }
    });
    this.$el.on('click', '.peer-answer-call', function() {
      if (self.isMedia) {
        self.answerCall();
      }
    });

    if (!this.isMedia) {
      this.$parent.on('submit', function(ev) {
        ev.preventDefault();

        self.$parent.find('input').each(function() {
          // TODO: files
          var value = $(this).val();
          if (value && self.connection) {
            self.connection.send(value);
          }
        });
      });
    }
  };

  Connection.prototype._createPeer = function() {
    // TODO(later): switch to a different key for tracking purposes.
    // We have to make a new Peer every time because we need to differentiate
    // between elements.
    this.peer = new Peer(this.internalId + (this.idOffset ? this.idOffset : ''), {
      key: 'lwjd5qra8257b9',
      debug: true,
      config: {'iceServers': [
        {url: 'stun:stun.l.google.com:19302'},
        {url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo'}
      ]}
    });

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
        self.peerId = remoteCall.peer.split('-').pop();
        self._maybeAnswerCall(remoteCall);
      });
    } else {
      this.peer.on('connect', function(connection) {
        self.connection = connection;
        self._setupDataHandlers();
        self.peerId = remoteCall.peer.split('-').pop();
      });
    }
  };

  Connection.prototype._maybeAnswerCall = function(remoteCall) {
    this.tempRemoteCall = remoteCall;
    if (!this.inUse) {
      if (this.options.manualCalls) {
        // emit a call if controls are hidden/ask if they want to answer?
        this._showNotification(remoteCall.peer + ' is calling.');
        this.$answerCall.removeClass('peer-hidden-element');
        this.$parent.trigger('peer.call', remoteCall.peer);
      } else {
        this.answerCall();
      }
    } else if (this.options.manualCalls) {
      this._showNotification(remoteCall.peer + ' is calling.');
      this.$answerCall.removeClass('peer-hidden-element');
    } else if (this.options.chatroulette) {
      this.endCall();
      this.answerCall();
    } else {
      // Otherwise, let it time out on the other side.
      this.tempRemoteCall = undefined;
    }
  };

  Connection.prototype.answerCall = function() {
    this.peerCall = this.tempRemoteCall;
    this._setupCallHandlers();
    this.peerCall.answer(this.stream);

    // Clean up
    this.tempRemoteCall = undefined;
    this.$answerCall.addClass('peer-hidden-element');
  };

  Connection.prototype._createStream = function() {
    var self = this;
    navigator.getUserMedia({audio: !this.options.disableAudio, video: !this.options.disableVideo}, function(stream) {
      self.stream = stream;

      if (!self.options.hideOwnVideo) {
        self.$localVideo.prop('src', URL.createObjectURL(stream));
      }

      if (typeof self.pendingCall !== 'undefined') {
        self._startCall(self.pendingCall);
      }
    }, function(err) {
      console.log('Error starting stream:', err);
      // TODO(michelle): Handle errors.
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

  Connection.prototype._startDataConnection = function(qualifiedId) {
    // Cancel current call.
    if (this.inUse || typeof this.pendingConnection !== 'undefined') {
      this._cancelConnection();
    }

    var self = this;
    if (!this.isMedia) {
      this.inUse = true;

      // TODO(later): wait for local stream? Can we not?
      if (!this.ready || !this.stream) {
        this.pendingConnection = qualifiedId;
        return;
      }

      this.pendingConnection = undefined;
      this.connection = this.peer.connect(qualifiedId);
      this._setupConnectionHandlers();
      // TODO(later): clean this up!
      setTimeout(this._cancelConnection.bind(this), this.options.timeout || 30000)
    } else {
      // ?
    }
  };

  Connection.prototype._cancelConnection = function() {
    this.inUse = false;
    this.pendingConnection = undefined;
    if (this.connection) {
      this.connection.close();
      this._showNotification('Ended connection with ' + this.peerId + '.');
      this.connection = undefined;
    }
  };

  Connection.prototype._startCall = function(qualifiedId) {
    // Cancel current call.
    if (this.inUse || typeof this.pendingCall !== 'undefined') {
      this._cancelCall();
    }


    var self = this;
    if (this.isMedia) {
      this.inUse = true;

      // TODO(later): wait for local stream? Can we not?
      if (!this.ready || !this.stream) {
        this.pendingCall = qualifiedId;
        return;
      }

      this.pendingCall = undefined;
      this.peerCall = this.peer.call(qualifiedId, this.stream);
      this._setupCallHandlers();
      setTimeout(this._cancelCall.bind(this), this.options.timeout || 30000)
    } else {
      // ?
    }
  };


  Connection.prototype._setupDataHandlers = function() {
    var self = this;
    this.connection.on('data', function(data) {
      self.$parent.trigger('peer.data', data);
    });
  };

  Connection.prototype._setupCallHandlers = function() {
    var self = this;
    this.peerCall.on('stream', function(stream) {
      self._showNotification('Connected to ' + self.peerId + '!');
      self.$endCall.removeClass('peer-hidden-element');
      self.$remoteVideo.prop('src', URL.createObjectURL(stream));
    });
    this.peerCall.on('error', function(err) {
      self._showNotification(err, 'error');
      throw err;
    });
    this.peerCall.on('close', function() {
      self.$endCall.addClass('peer-hidden-element');
      self._showNotification('Call with ' + self.peerId + ' ended.');
    });
  };

  Connection.prototype._cancelCall = function() {
    this.inUse = false;
    this.pendingCall = undefined;
    if (this.peerCall) {
      this.peerCall.close();
      this._showNotification('Ended call with ' + this.peerId + '.');
      this.peerCall = undefined;
    }
  };

  Connection.prototype._checkPeerType = function(type) {
    if (type && this.type !== type) {
      // TODO(later): link to documentation or something nice..
      throw new Error('Whoops! This element supports ' + this.type
          + ' but you are trying to make a ' + type + ' connection.');
    }
  };

  Connection.prototype.connect = function(identifier) {
    this._checkPeerType('data');
    this._startDataConnection(this._generateIdentifier(identifier));
  };

  Connection.prototype.call = function(identifier) {
    this._checkPeerType('media');
    this._startCall(this._generateIdentifier(identifier));
  };

  Connection.prototype._generateIdentifier = function(identifier) {
    this.peerId = identifier;

    if (this.room) {
      identifier = this.room + '-' + identifier;
    }
    return this.type + '-' + identifier;
  };

  Connection.prototype.endCall = function() {
    this._cancelCall();
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
  Connection.prototype._constructCommonElements = function() {

    if (!this.options.hideAllControls) {
      // Should be under common elements.
      this.$buddyList = $('<div>');
      this.$buddyList.addClass('peer-buddy-list');
      this.$el.append(this.$buddyList);

      this.$controls = $('<div>');
      this.$controls.addClass('peer-controls');
      this.$notifications = $('<div>');
      this._resetNotification();
      this.$controls.append(this.$notifications);
    }

  };

  Connection.prototype._constructMediaElements = function() {
    if (!this.options.hideOwnVideo) {
      this.$localVideo = $('<video autoplay>');
      this.$localVideo.addClass('peer-video-local');
      this.$localVideo.attr('muted', 'true');
      this.$el.append(this.$localVideo);
    }

    this.$remoteVideo = $('<video autoplay>');
    this.$remoteVideo.addClass('peer-video-remote');
    this.$el.prepend(this.$remoteVideo);

    if (!this.options.hideAllControls) {
      // Should be under common elements.
      this.$endCall = $('<a>');
      this.$endCall.addClass('peer-end-call peer-hidden-element');
      this.$endCall.text(this.options.endCallText || 'End call');
      this.$controls.append(this.$endCall);

      this.$answerCall = $('<a>');
      this.$answerCall.addClass('peer-answer-call peer-hidden-element');
      this.$answerCall.text(this.options.answerCallText || 'Answer call');
      this.$controls.append(this.$answerCall);

      this.$el.append(this.$controls);
    }
  };

  Connection.prototype._refreshBuddyList = function() {
    if (this.options.hideAllControls) {
      return;
    }

    var self = this;
    this.availablePeers(function(peers) {
      self.$buddyList.empty();
      peers.forEach(function(peer) {
        var $buddy = $('<div>');
        $buddy.attr('class', 'peer-buddy');
        $buddy.text(peer);
        self.$buddyList.append($buddy);
      });

      // Set timeout to repull buddy list.
      // TODO(later): peerjs should probably push buddies.
      setTimeout(self._refreshBuddyList.bind(self), 30000);
    });
  };

  Connection.prototype._showNotification = function(message, type) {
    if (this.options.hideAllControls) {
      return;
    }

    this.$notifications.text(message);
    this.$notifications.removeClass('peer-hidden');
    if (type) {
      this.$notifications.addClass('peer-' + type);
    }
  };

  Connection.prototype._resetNotification = function() {
    if (this.options.hideAllControls) {
      return;
    }

    this.$notifications.attr('class', 'peer-notification peer-hidden');
    this.$notifications.text('');
  };

  // Make an element a peer!
  $.fn.peer = function(options, callback) {
    // Check if PeerJS is imported.
    if (!window.Peer) {
      throw new Error('You need to import PeerJS in order to use jquery.peer. Try putting this in your HTML: `<script type="text/javascript" src="http://cdn.peerjs.com/latest/peer.js"></script>`');
    }

    // TODO(later): maybe this is unnecessary.
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
