# jquery.peer

Peer-to-peer video chats built on top of WebRTC, with an easy-to-use jQuery interface.

Support for data calls forthcoming!

## Usage

This library requires that you also include [PeerJS](https://github.com/peers/peerjs) ^0.3.7.

```html
  <!-- Include the scripts in your HTML -->
  <script type="text/javascript" src="http://cdn.peerjs.com/0.3.7/peer.min.js"></script>
  <script type="text/javascript" src="jquery.peer.js"></script>
```

```javascript
// Instantiate your videochat element:
$(‘#my-videochat-element’).peer([options]);
```

---

**Options:**

`options` is an optional hash of the following:

- `id`: If unspecified, will be automatically generated for you.
- `room`
- `hideAllControls`: Hide the “End call” and “Room list” elements that are automatically placed in your `peer` element. If you hide these controls, you’ll need to make calls manually.
- `timeout`: milliseconds to wait before giving up on a call/connection.

**Advanced options:**

- `manualCalls`: When a call comes in, you can choose whether or not to accept it if `manualCalls` is enabled.
- `hideOwnVideo`: Hide your own video from the display.
- `chatroulette`: If true, existing call will end automatically when someone else calls.
- `endCallText`: Custom text for the “End call” display.
- `answerCallText`: Custom text for the “Answer call” display. This display is only shown if `manualCalls` is enabled.

---

**Making calls manually:**

```javascript
// Instantiate your videochat element and call a peer (`id`) in your room manually:
$(‘#my-videochat-element’).peer([options]).peer(‘call’, id);
```

`call` is just one of many available methods.

---

**Other available methods:**

- `call`
- `endCall`
- `answerCall`
- `connect` (WIP)
- `endConnection` (WIP)

---

**Events**

- `peer.data`
- `peer.call`
