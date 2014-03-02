/*! jquery.peer 0.0.0 (2014-03-01). @michelle */

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
    // TODO(later): switch to a different key for tracking purposes.
    this.peer = new Peer(this.id, {key: 'lwjd5qra8257b9'});

    var self = this;
    this.peer.on('error', function(err) {
      self.handleError(err);
    });

    this.peer.on('open', function() {
      self.ready = true;
      if (typeof self.pendingCall !== undefined) {
        self.startCall(self.pendingCall);
      }
    });

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
      // emit call so they can answer?
      if (this.options.manualCalls) {
      } else {
        remoteCall.answer(this.stream);
      }
    }
    // Otherwise, let it time out on the other side.
  }

  Connection.prototype.createStream = function() {
    var self = this;
    navigator.getUserMedia({audio: true, video: true}, function(stream) {
      self.stream = stream;

      if (!self.options.hideOwnVideo) {
        $('#peer-video-local').prop('src', URL.createObjectURL(stream));
      }

      if (typeof self.pendingCall !== undefined) {
        self.startCall(self.pendingCall);
      }
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
    } else if (!err.type) {
      throw err;
    } else {
      // Basically 500 for all other error types.
      throw new Error('Oops. Something went wrong internally! :(: ' + err);
    }
  }

  Connection.prototype.startCall = function(peerId) {
    // Maybe we don't want to do this?
    // Chatroulette style!
    if (this.inCall && typeof this.pendingCall !== 'undefined') {
      this.cancelCall();
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
      this.call.on('stream', function(stream) {
        $('#peer-video-remote').prop('src', URL.createObjectURL(stream));
      })
      this.call.on('error', function(err) {
        throw err;
      })
      // TODO: set timeout to stop trying to call.
      setTimeout(this.cancelCall.bind(this), this.options.callTimeout || 30000)
    } else {
      // ?
    }
  }

  Connection.prototype.cancelCall = function() {
    this.inCall = false;
    this.pendingCall = undefined;
    if (this.call) {
      this.call.close();
    }
  }


  function constructMediaElements(parent, hideAllDisplays, hideOwnVideo) {
    var $parent = $(parent);

    if (!hideOwnVideo) {
      var $localVideo = $('<video autoplay>');
      $localVideo.attr('id', 'peer-video-local');
      $localVideo.attr('muted', 'true');
      $parent.append($localVideo);
    }

    var $remoteVideo = $('<video autoplay>');
    $remoteVideo.attr('id', 'peer-video-remote');
    $parent.append($remoteVideo);

    if (!hideAllDisplays) {
      // TODO
    }
  }


  $.fn.extend({
    peer: function(type, identifier, options, callback) {
      if (!window.Peer) {
        throw new Error('You need to import PeerJS in order to use jquery.peer. Try putting this in your HTML: `<script type="text/javascript" src="http://cdn.peerjs.com/0.3/peer.js"></script>`');
      }

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


      this._peerConnection = new Connection(this, type, options.room ? options.room + '-' + identifier : identifier, options);
      this._peerType = type;
      this._peerRoom = options.room;

      callback.call(this);
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

      //this._peerConnection.listAvailablePeers(); // TODO(peerjs): implement this in PeerJS
    },

    _checkPeerType: function(type) {
      if ((type && this._peerType !== type) || !this._peerConnection) {
        // TODO(later): link to documentation or something nice..
        throw new Error('You first have to call $(element).peer(\'' + type + '\', ...) on this element.');
      }
    }

  });


})(jQuery);
