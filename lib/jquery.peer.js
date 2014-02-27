
(function($) {

  // Compatibility
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  function Connection($el, type, id, options) {
    this.options = options;
    this.isMedia = type === 'media';
    this.id = id;
    this.$el = $el;

    if (this.isMedia) {
      this.createStream();
    }

    this.createPeer();
  }

  Connection.prototype.createPeer = function() {
    // TODO: switch to a different key for tracking purposes.
    this.peer = new Peer(this.id, {key: 'lwjd5qra8257b9'});

    var self = this;
    this.peer.on('error', function(err) {
      self.handleError(err);
    };

    if (this.isMedia) {
      this.peer.on('call', function(remoteCall) {
        self.maybeAnswerCall(remoteCall);
      });
    } else {
      // ?
    }
  }

  Connection.prototype.maybeAnswerCall = function(remoteCall) {
    if (!this.inCall) {
      remoteCall.answer(this.stream);
    }
    // Otherwise, let it time out on the other side.
  }

  Connection.prototype.createStream = function() {
    var self = this;
    navigator.getUserMedia({audio: true, video: true}, function(stream) {
      self.stream = stream;

      // TODO: add stream to self video el.
      // If options.hideOwnVideo is true, we should not show the self video el.
    });
  }

  Connection.prototype.handleError = function(err) {
    if (['invalid-id', 'browser-incompatible'].indexOf(err.type) !== -1) {
      throw err;
    } else if (err.type === 'unavailable-id') {
      // Keep trying IDs until we find an untaken.
      // We can do this smarter once we implement listAvailablePeers() in
      // PeerJS.
      this.idOffset = this.idOffset || 0;
      this.id = this.id + this.idOffset;
      this.idOffset += 1;
      this.createPeer();
    } else {
      // Basically 500 for all other error types.
      throw new Error('Oops. Something went wrong internally! :(');
    }
  }

  Connection.prototype.startCall = function(peerId) {
    // Maybe we don't want to do this?
    // Chatroulette style!
    if (this.inCall) {
      this.cancelCall();
    }

    var self = this;
    if (this.isMedia) {
      this.inCall = true;
      this.call = this.peer.call(peerId, this.stream);
      this.call.on('stream', function(stream) {
        // TODO: add stream to remote video el.
      })
      this.call.on('error', function(err) {
        throw err;
      })
      // TODO: set timeout to stop trying to call.
      this.setTimeout(this.cancelCall.bind(this), this.options.callTimeout || 30000)
    } else {
      // ?
    }
  }

  Connection.prototype.cancelCall = function() {
    this.inCall = false;
    if (this.call) {
      this.call.close();
    }
  }


  function constructMediaElements($parent, hideAllDisplays, hideOwnVideo) {
    // TODO
  }


  $.fn.extend({
    // TODO: support more than the media type.
    peer: function(type, identifier, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }
      options = options || {};

      // Maybe this is unnecessary and we don't even want rooms?
      if (options.room && options.room.indexOf('-') !== -1) {
        throw new Error('ID must be alphanumeric.');
      }

      if (identifier.indexOf('-') !== -1) {
        throw new Error('ID must be alphanumeric.');
      }

      if (!options.hideAllDisplays) {
        if (type === 'media') {
          // TODO: show all fancy things~
        } else {

        }
      }

      if (type === 'media') {
        constructMediaElements(this, options.hideAllDisplays, options.hideOwnVideo);
      } else {
        // ?
      }


      this._peerConnection = new Connection(this, type, options.room ? options.room + '-' + identifier : identifier);
      this._peerType = type;
      this._peerRoom = options.room;

      callback();
    },

    call: function(identifier) {
      this._checkPeerType('media');
      this._peerConnection.startCall(this._peerRoom ? this._peerRoom + '-' + identifier : identifier);
    },

    endCall: function() {
      this._checkPeerType('media');
    },

    // Returns an array of peers that are available for this peer to connect to.
    availablePeers: function() {
      this._checkPeerType();

      //this._peerConnection.listAvailablePeers(); // TODO: implement this in PeerJS
    },

    _checkPeerType: function(type) {
      if ((type && this._peerType !== type) || !this._peerConnection) {
        // TODO: link to documentation or something nice..
        throw new Error('You first have to call $(element).peer(\'' + type + '\', ...) on this element.');
      }
    }

  });


})(jQuery);
