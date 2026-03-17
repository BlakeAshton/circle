import {
  Mic,
  MicOff,
  Phone,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGetCallConfig } from "../api/client";

const FALLBACK_ICE_SERVERS = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];
const REMOTE_MEDIA_TIMEOUT_MS = 12000;

function createDefaultRtcConfiguration() {
  return {
    iceServers: FALLBACK_ICE_SERVERS,
    iceTransportPolicy: "all",
  };
}

function normalizeIceServers(rawServers) {
  if (!Array.isArray(rawServers)) return FALLBACK_ICE_SERVERS;
  const normalized = rawServers
    .map((server) => {
      const urls = Array.isArray(server?.urls)
        ? server.urls.map((value) => `${value ?? ""}`.trim()).filter(Boolean)
        : [`${server?.urls ?? ""}`.trim()].filter(Boolean);
      if (urls.length === 0) return null;
      const nextServer = { urls };
      if (`${server?.username ?? ""}`.trim()) {
        nextServer.username = `${server.username}`.trim();
      }
      if (`${server?.credential ?? ""}`.trim()) {
        nextServer.credential = `${server.credential}`.trim();
      }
      return nextServer;
    })
    .filter(Boolean);
  return normalized.length > 0 ? normalized : FALLBACK_ICE_SERVERS;
}

function normalizeRtcConfiguration(rawConfig) {
  return {
    iceServers: normalizeIceServers(rawConfig?.iceServers),
    iceTransportPolicy:
      `${rawConfig?.iceTransportPolicy ?? ""}`.trim().toLowerCase() === "relay"
        ? "relay"
        : "all",
  };
}

function hasTurnServer(configuration) {
  return (configuration?.iceServers ?? []).some((server) => {
    const urls = Array.isArray(server?.urls) ? server.urls : [server?.urls];
    return urls.some((url) => `${url ?? ""}`.trim().toLowerCase().startsWith("turn"));
  });
}

function formatDuration(startedAt, nowValue) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((nowValue - started) / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isTerminalStatus(status) {
  return ["ended", "declined", "canceled", "missed"].includes(status);
}

function getBaseStatusCopy(call, isInitiator) {
  if (call.status === "ringing") {
    return isInitiator ? "Calling..." : "Incoming call";
  }
  if (call.status === "declined") return "Call declined";
  if (call.status === "canceled") return "Call canceled";
  if (call.status === "missed") return "Missed call";
  if (call.status === "ended") return "Call ended";
  return "Securing connection...";
}

function createEmptyMediaState() {
  return { audio: false, video: false };
}

function isTrackUsable(track) {
  return Boolean(track) && track.readyState === "live" && !track.muted;
}

export default function CallOverlay({
  currentUserId,
  call,
  events,
  onAccept,
  onDecline,
  onEnd,
  onSendSignal,
}) {
  const isInitiator = call?.initiatorId === currentUserId;
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(call?.mode === "video");
  const [clockNow, setClockNow] = useState(Date.now());
  const [transportState, setTransportState] = useState("new");
  const [iceState, setIceState] = useState("new");
  const [remoteMediaState, setRemoteMediaState] = useState(createEmptyMediaState);
  const [mediaConnectedAt, setMediaConnectedAt] = useState("");
  const [rtcConfiguration, setRtcConfiguration] = useState(createDefaultRtcConfiguration);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const offerStartedRef = useRef(false);
  const processedEventIdsRef = useRef(new Set());
  const queuedIceCandidatesRef = useRef([]);
  const toneContextRef = useRef(null);
  const toneTimerRef = useRef(null);
  const rtcConfigPromiseRef = useRef(null);
  const remoteTrackCleanupRef = useRef(new Map());

  const callEvents = useMemo(
    () => events.filter((event) => event.callId === call.id),
    [call.id, events]
  );
  const relayEnabled = useMemo(() => hasTurnServer(rtcConfiguration), [rtcConfiguration]);
  const transportReady =
    ["connected", "completed"].includes(transportState) ||
    ["connected", "completed"].includes(iceState);
  const mediaConnected = call.status === "active" && transportReady && remoteMediaState.audio;

  function attachStream(node, stream, options = {}) {
    if (!node) return;
    if (typeof options.muted === "boolean") {
      node.muted = options.muted;
    }
    if (node.srcObject !== stream) {
      node.srcObject = stream;
    }
    if (typeof node.play === "function") {
      node.play().catch(() => {});
    }
  }

  const syncMediaNodes = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      attachStream(localVideoRef.current, localStreamRef.current, { muted: true });
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      attachStream(remoteVideoRef.current, remoteStreamRef.current, { muted: false });
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      attachStream(remoteAudioRef.current, remoteStreamRef.current, { muted: false });
    }
  }, []);

  const clearRemoteTrackWatchers = useCallback(() => {
    remoteTrackCleanupRef.current.forEach((cleanup) => cleanup());
    remoteTrackCleanupRef.current.clear();
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onicecandidateerror = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setTransportState("closed");
    setIceState("closed");
  }, []);

  const cleanupMedia = useCallback(() => {
    clearRemoteTrackWatchers();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    cleanupPeerConnection();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setRemoteMediaState(createEmptyMediaState());
    setMediaConnectedAt("");
  }, [cleanupPeerConnection, clearRemoteTrackWatchers]);

  const stopRingTone = useCallback(() => {
    if (toneTimerRef.current) {
      clearInterval(toneTimerRef.current);
      toneTimerRef.current = null;
    }
    if (toneContextRef.current) {
      toneContextRef.current.close().catch(() => {});
      toneContextRef.current = null;
    }
  }, []);

  const playRingTone = useCallback((variant = "outgoing") => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!toneContextRef.current) {
      toneContextRef.current = new AudioCtor();
    }
    const context = toneContextRef.current;
    context.resume().catch(() => {});

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = variant === "incoming" ? 740 : 520;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);

    const start = context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + (variant === "incoming" ? 0.42 : 0.28)
    );
    oscillator.start(start);
    oscillator.stop(start + (variant === "incoming" ? 0.45 : 0.32));
  }, []);

  const updateRemoteMediaState = useCallback((kind, active) => {
    if (!["audio", "video"].includes(kind)) return;
    setRemoteMediaState((prev) =>
      prev[kind] === active ? prev : { ...prev, [kind]: active }
    );
  }, []);

  const observeRemoteTrack = useCallback(
    (track) => {
      if (!track || remoteTrackCleanupRef.current.has(track.id)) return;
      const kind = track.kind === "video" ? "video" : "audio";
      const syncTrackState = () => {
        updateRemoteMediaState(kind, isTrackUsable(track));
      };
      syncTrackState();
      track.addEventListener("unmute", syncTrackState);
      track.addEventListener("mute", syncTrackState);
      track.addEventListener("ended", syncTrackState);
      remoteTrackCleanupRef.current.set(track.id, () => {
        track.removeEventListener("unmute", syncTrackState);
        track.removeEventListener("mute", syncTrackState);
        track.removeEventListener("ended", syncTrackState);
      });
    },
    [updateRemoteMediaState]
  );

  const ensureRemoteStream = useCallback(() => {
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }
    syncMediaNodes();
    return remoteStreamRef.current;
  }, [syncMediaNodes]);

  const loadRtcConfiguration = useCallback(async () => {
    if (rtcConfigPromiseRef.current) return rtcConfigPromiseRef.current;
    rtcConfigPromiseRef.current = apiGetCallConfig()
      .then((data) => {
        const nextConfig = normalizeRtcConfiguration(data?.rtcConfiguration ?? data);
        setRtcConfiguration(nextConfig);
        return nextConfig;
      })
      .catch(() => {
        const fallbackConfig = createDefaultRtcConfiguration();
        setRtcConfiguration(fallbackConfig);
        return fallbackConfig;
      });
    return rtcConfigPromiseRef.current;
  }, []);

  const addLocalTracksToConnection = useCallback((connection, stream) => {
    if (!connection || !stream) return;
    const senderTrackIds = new Set(
      connection
        .getSenders()
        .map((sender) => sender.track?.id)
        .filter(Boolean)
    );
    stream.getTracks().forEach((track) => {
      if (!senderTrackIds.has(track.id)) {
        connection.addTrack(track, stream);
      }
    });
  }, []);

  const ensurePeerConnection = useCallback(
    async (localStream = null) => {
      if (peerConnectionRef.current) {
        addLocalTracksToConnection(peerConnectionRef.current, localStream);
        return peerConnectionRef.current;
      }

      const nextRtcConfiguration = await loadRtcConfiguration();
      const connection = new window.RTCPeerConnection(nextRtcConfiguration);
      setTransportState(connection.connectionState || "new");
      setIceState(connection.iceConnectionState || "new");
      addLocalTracksToConnection(connection, localStream);

      connection.onicecandidate = (event) => {
        if (!event.candidate) return;
        onSendSignal(call.id, "ice", {
          candidate: event.candidate.toJSON
            ? event.candidate.toJSON()
            : event.candidate,
        }).catch(() => {});
      };

      connection.ontrack = (event) => {
        const nextRemoteStream = ensureRemoteStream();
        const incomingTracks = event.streams?.[0]?.getTracks?.().length
          ? event.streams[0].getTracks()
          : [event.track];
        incomingTracks.filter(Boolean).forEach((track) => {
          if (!nextRemoteStream.getTrackById(track.id)) {
            nextRemoteStream.addTrack(track);
          }
          observeRemoteTrack(track);
        });
        syncMediaNodes();
        setError("");
      };

      connection.onconnectionstatechange = () => {
        const nextState = connection.connectionState || "new";
        setTransportState(nextState);
        if (nextState === "failed") {
          setError(
            relayEnabled
              ? "Connection failed. Try calling again."
              : "Connection failed. TURN relay is not configured for stricter networks."
          );
        } else if (nextState === "disconnected") {
          setError("Connection dropped. Trying to reconnect...");
        } else if (["connected", "completed"].includes(nextState)) {
          setError("");
        }
      };

      connection.oniceconnectionstatechange = () => {
        const nextState = connection.iceConnectionState || "new";
        setIceState(nextState);
        if (nextState === "failed") {
          setError(
            relayEnabled
              ? "Media path failed. Try calling again."
              : "Media path failed. Add TURN relay settings for stricter mobile networks."
          );
        } else if (["connected", "completed"].includes(nextState)) {
          setError("");
        }
      };

      peerConnectionRef.current = connection;
      syncMediaNodes();
      return connection;
    },
    [
      addLocalTracksToConnection,
      call.id,
      ensureRemoteStream,
      loadRtcConfiguration,
      observeRemoteTrack,
      onSendSignal,
      relayEnabled,
      syncMediaNodes,
    ]
  );

  const flushQueuedIceCandidates = useCallback(async (connection) => {
    if (!connection?.remoteDescription) return;
    while (queuedIceCandidatesRef.current.length > 0) {
      const candidate = queuedIceCandidatesRef.current.shift();
      try {
        await connection.addIceCandidate(new window.RTCIceCandidate(candidate));
      } catch {
        // Ignore stale ICE candidates.
      }
    }
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      syncMediaNodes();
      return localStreamRef.current;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are unavailable");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: call.mode === "video",
    });
    localStreamRef.current = stream;
    setCameraEnabled(call.mode === "video");
    syncMediaNodes();
    return stream;
  }, [call.mode, syncMediaNodes]);

  const startOutgoingOffer = useCallback(async () => {
    const stream = await ensureLocalMedia();
    const connection = await ensurePeerConnection(stream);
    const offer = await connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: call.mode === "video",
    });
    await connection.setLocalDescription(offer);
    await onSendSignal(call.id, "offer", {
      type: offer.type,
      sdp: offer.sdp,
    });
    offerStartedRef.current = true;
  }, [call.id, call.mode, ensureLocalMedia, ensurePeerConnection, onSendSignal]);

  async function handleAccept() {
    setError("");
    try {
      const stream = await ensureLocalMedia();
      await ensurePeerConnection(stream);
      await onAccept(call.id);
    } catch {
      setError("Microphone or camera permission was blocked.");
      await onDecline(call.id);
    }
  }

  async function handleDecline() {
    stopRingTone();
    cleanupMedia();
    await onDecline(call.id);
  }

  async function handleEnd() {
    stopRingTone();
    try {
      await onEnd(call.id);
    } finally {
      cleanupMedia();
    }
  }

  function toggleMute() {
    const nextMuted = !muted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setMuted(nextMuted);
  }

  function toggleCamera() {
    const nextEnabled = !cameraEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextEnabled;
      });
    }
    setCameraEnabled(nextEnabled);
  }

  useEffect(() => {
    syncMediaNodes();
  });

  useEffect(() => {
    loadRtcConfiguration().catch(() => {});
  }, [loadRtcConfiguration]);

  useEffect(() => {
    if (isTerminalStatus(call.status)) {
      stopRingTone();
      cleanupMedia();
    }
  }, [call.status, cleanupMedia, stopRingTone]);

  useEffect(() => {
    if (!isInitiator || !["ringing", "active"].includes(call.status) || offerStartedRef.current) {
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        await startOutgoingOffer();
      } catch {
        if (!cancelled) {
          setError("Could not access your microphone or camera.");
          await onEnd(call.id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call.id, call.status, isInitiator, onEnd, startOutgoingOffer]);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const event of callEvents) {
        if (!alive || processedEventIdsRef.current.has(event.id)) continue;
        if (event.senderId === currentUserId) {
          processedEventIdsRef.current.add(event.id);
          continue;
        }

        if (["accepted", "decline", "cancel", "end"].includes(event.type)) {
          processedEventIdsRef.current.add(event.id);
          if (event.type !== "accepted") {
            cleanupMedia();
          }
          continue;
        }

        if (event.type === "offer") {
          if (isInitiator || !localStreamRef.current) {
            continue;
          }
          const connection = await ensurePeerConnection(localStreamRef.current);
          await connection.setRemoteDescription(
            new window.RTCSessionDescription(event.payload)
          );
          await flushQueuedIceCandidates(connection);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await onSendSignal(call.id, "answer", {
            type: answer.type,
            sdp: answer.sdp,
          });
          processedEventIdsRef.current.add(event.id);
          continue;
        }

        if (event.type === "answer") {
          if (!peerConnectionRef.current) {
            continue;
          }
          const connection = await ensurePeerConnection(localStreamRef.current);
          if (!connection.localDescription) {
            continue;
          }
          await connection.setRemoteDescription(
            new window.RTCSessionDescription(event.payload)
          );
          await flushQueuedIceCandidates(connection);
          processedEventIdsRef.current.add(event.id);
          continue;
        }

        if (event.type === "ice") {
          const candidate = event.payload?.candidate;
          if (!candidate) {
            processedEventIdsRef.current.add(event.id);
            continue;
          }
          if (!peerConnectionRef.current) {
            queuedIceCandidatesRef.current.push(candidate);
            processedEventIdsRef.current.add(event.id);
            continue;
          }
          const connection = await ensurePeerConnection(localStreamRef.current);
          if (connection.remoteDescription) {
            await connection.addIceCandidate(new window.RTCIceCandidate(candidate));
          } else {
            queuedIceCandidatesRef.current.push(candidate);
          }
          processedEventIdsRef.current.add(event.id);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    call.id,
    callEvents,
    cleanupMedia,
    currentUserId,
    ensurePeerConnection,
    flushQueuedIceCandidates,
    isInitiator,
    onSendSignal,
  ]);

  useEffect(() => {
    if (call.status !== "ringing") {
      stopRingTone();
      return undefined;
    }
    const variant = isInitiator ? "outgoing" : "incoming";
    playRingTone(variant);
    toneTimerRef.current = setInterval(() => {
      playRingTone(variant);
    }, variant === "incoming" ? 2100 : 1600);
    return () => {
      stopRingTone();
    };
  }, [call.status, isInitiator, playRingTone, stopRingTone]);

  useEffect(() => {
    if (call.status !== "active") return undefined;
    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [call.status]);

  useEffect(() => {
    if (mediaConnected) {
      setMediaConnectedAt((prev) => prev || new Date().toISOString());
    } else if (call.status !== "active") {
      setMediaConnectedAt("");
    }
  }, [call.status, mediaConnected]);

  useEffect(() => {
    if (call.status !== "active" || mediaConnected) return undefined;
    const timeoutId = setTimeout(() => {
      setError((prev) => {
        if (prev) return prev;
        return relayEnabled
          ? "The call connected, but media is still negotiating. Try hanging up and calling again."
          : "The call connected, but media is still negotiating. TURN relay is not configured, so some mobile networks may fail.";
      });
    }, REMOTE_MEDIA_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [call.status, mediaConnected, relayEnabled]);

  useEffect(() => {
    const node = remoteAudioRef.current;
    if (!node) return undefined;
    const markReady = () => updateRemoteMediaState("audio", true);
    const syncFromTracks = () => {
      const hasLiveAudio = Boolean(
        remoteStreamRef.current?.getAudioTracks().some((track) => isTrackUsable(track))
      );
      updateRemoteMediaState("audio", hasLiveAudio);
    };
    node.addEventListener("playing", markReady);
    node.addEventListener("pause", syncFromTracks);
    node.addEventListener("ended", syncFromTracks);
    return () => {
      node.removeEventListener("playing", markReady);
      node.removeEventListener("pause", syncFromTracks);
      node.removeEventListener("ended", syncFromTracks);
    };
  }, [call.id, updateRemoteMediaState]);

  useEffect(() => {
    const node = remoteVideoRef.current;
    if (!node) return undefined;
    const markReady = () => updateRemoteMediaState("video", true);
    const syncFromTracks = () => {
      const hasLiveVideo = Boolean(
        remoteStreamRef.current?.getVideoTracks().some((track) => isTrackUsable(track))
      );
      updateRemoteMediaState("video", hasLiveVideo);
    };
    node.addEventListener("playing", markReady);
    node.addEventListener("pause", syncFromTracks);
    node.addEventListener("ended", syncFromTracks);
    return () => {
      node.removeEventListener("playing", markReady);
      node.removeEventListener("pause", syncFromTracks);
      node.removeEventListener("ended", syncFromTracks);
    };
  }, [call.id, remoteMediaState.video, updateRemoteMediaState]);

  useEffect(() => {
    return () => {
      stopRingTone();
      cleanupMedia();
    };
  }, [cleanupMedia, stopRingTone]);

  const statusCopy =
    call.status === "active"
      ? mediaConnected
        ? "Connected"
        : transportReady
          ? "Connecting media..."
          : "Securing connection..."
      : getBaseStatusCopy(call, isInitiator);
  const durationLabel = mediaConnectedAt
    ? formatDuration(mediaConnectedAt, clockNow)
    : call.status === "active"
      ? "Connecting..."
      : call.mode === "video"
        ? "Video call"
        : "Voice call";
  const helperCopy =
    call.status === "ringing" && isInitiator
      ? "Waiting for them to answer..."
      : mediaConnected
        ? relayEnabled
          ? "Media is live."
          : "Direct media is live."
        : statusCopy;
  const showRemoteVideo =
    call.mode === "video" &&
    remoteMediaState.video &&
    remoteStreamRef.current?.getVideoTracks().some((track) => track.readyState === "live");
  const showLocalVideo =
    call.mode === "video" &&
    cameraEnabled &&
    localStreamRef.current?.getVideoTracks().some((track) => track.readyState === "live");

  return (
    <div className="call-overlay-backdrop">
      <div className="call-overlay glass">
        <button
          type="button"
          className="call-overlay-close icon-button"
          onClick={() => {
            if (call.status === "ringing" && !isInitiator) {
              handleDecline();
            } else {
              handleEnd();
            }
          }}
          aria-label="Close call"
        >
          <X aria-hidden="true" />
        </button>

        <div className="call-overlay-head">
          <div className="call-overlay-copy">
            <span className="call-overlay-kicker">
              {call.mode === "video" ? "Video chat" : "Voice chat"}
            </span>
            <h3>{call.partner?.name || call.threadName}</h3>
            <p>{statusCopy}</p>
          </div>
          <div className="call-overlay-meta">
            <strong>{durationLabel}</strong>
            <span>{call.partner?.handle || ""}</span>
          </div>
        </div>

        <div className={call.mode === "video" ? "call-stage video" : "call-stage audio"}>
          {showRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              className="call-remote-video"
              autoPlay
              playsInline
            />
          ) : (
            <div className="call-remote-fallback">
              <span className="call-avatar-shell">
                {call.partner?.avatar ? (
                  <img src={call.partner.avatar} alt={call.partner.name} />
                ) : (
                  <span>{(call.partner?.name || "?").slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <strong>{call.partner?.name || "Call"}</strong>
              <span>{helperCopy}</span>
            </div>
          )}

          {showLocalVideo ? (
            <video
              ref={localVideoRef}
              className="call-local-video"
              autoPlay
              playsInline
              muted
            />
          ) : null}
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>

        {error ? <div className="call-overlay-error">{error}</div> : null}

        <div className="call-overlay-controls">
          {call.status === "ringing" && !isInitiator ? (
            <>
              <button
                type="button"
                className="call-control decline"
                onClick={handleDecline}
              >
                <X aria-hidden="true" />
                <span>Decline</span>
              </button>
              <button type="button" className="call-control accept" onClick={handleAccept}>
                {call.mode === "video" ? <Video aria-hidden="true" /> : <Phone aria-hidden="true" />}
                <span>Answer</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={muted ? "call-control active" : "call-control"}
                onClick={toggleMute}
              >
                {muted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
                <span>{muted ? "Unmute" : "Mute"}</span>
              </button>
              {call.mode === "video" ? (
                <button
                  type="button"
                  className={cameraEnabled ? "call-control" : "call-control active"}
                  onClick={toggleCamera}
                >
                  {cameraEnabled ? <Video aria-hidden="true" /> : <VideoOff aria-hidden="true" />}
                  <span>{cameraEnabled ? "Camera on" : "Camera off"}</span>
                </button>
              ) : null}
              <button type="button" className="call-control hangup" onClick={handleEnd}>
                <Phone aria-hidden="true" />
                <span>{call.status === "ringing" ? "Cancel" : "Hang up"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
