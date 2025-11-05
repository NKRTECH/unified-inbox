"use strict";
/**
 * WebSocket Types and Interfaces
 * Defines the structure for real-time communication events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventType = void 0;
var WebSocketEventType;
(function (WebSocketEventType) {
    // Message events
    WebSocketEventType["MESSAGE_SENT"] = "message:sent";
    WebSocketEventType["MESSAGE_RECEIVED"] = "message:received";
    WebSocketEventType["MESSAGE_STATUS_UPDATED"] = "message:status_updated";
    // Conversation events
    WebSocketEventType["CONVERSATION_UPDATED"] = "conversation:updated";
    // Typing indicators
    WebSocketEventType["TYPING_START"] = "typing:start";
    WebSocketEventType["TYPING_STOP"] = "typing:stop";
    // Presence events
    WebSocketEventType["USER_JOINED"] = "user:joined";
    WebSocketEventType["USER_LEFT"] = "user:left";
    WebSocketEventType["PRESENCE_UPDATE"] = "presence:update";
    WebSocketEventType["PRESENCE_STATE"] = "presence:state";
    // Connection events
    WebSocketEventType["CONNECTED"] = "connected";
    WebSocketEventType["DISCONNECTED"] = "disconnected";
    WebSocketEventType["ERROR"] = "error";
})(WebSocketEventType || (exports.WebSocketEventType = WebSocketEventType = {}));
