import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/userContext';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { FaPhoneSlash } from 'react-icons/fa';

const Meet = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomName, setRoomName] = useState('');
  const [meetingData, setMeetingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [showLeaveButton, setShowLeaveButton] = useState(true);
  const [isMeetingInitialized, setIsMeetingInitialized] = useState(false);
  const leaveButtonTimeout = useRef(null);

  const jitsiContainer = useRef(null);
  const jitsiApiRef = useRef(null);
  const scriptRef = useRef(null);
  const videoContainerRef = useRef(null);

  const urlRoom = searchParams.get('room');

  const startMeeting = async () => {
    const finalRoomName = urlRoom || roomName.trim();
    if (!finalRoomName) {
      setError('Please enter a room name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post(API_PATHS.MEET.CREATE_MEETING, {
        roomName: finalRoomName,
      });
      setMeetingData(response.data);
      setHasJoined(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create meeting');
      console.error('Meeting creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlRoom && !hasJoined) {
      setRoomName(urlRoom);
      startMeeting();
    }
  }, [urlRoom, hasJoined]);

  useEffect(() => {
    if (!meetingData || !videoContainerRef.current) return;

    const container = videoContainerRef.current;

    const handleMouseEnter = () => {
      setShowLeaveButton(true);
      clearTimeout(leaveButtonTimeout.current);
    };

    const handleMouseLeave = () => {
      leaveButtonTimeout.current = setTimeout(() => {
        setShowLeaveButton(false);
      }, 4000);
    };

    const handleMouseMove = () => {
      setShowLeaveButton(true);
      clearTimeout(leaveButtonTimeout.current);
      leaveButtonTimeout.current = setTimeout(() => {
        setShowLeaveButton(false);
      }, 4000);
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(leaveButtonTimeout.current);
    };
  }, [meetingData]);

  useEffect(() => {
    const cleanupJitsi = () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      const iframe = document.querySelector('.jitsi-iframe');
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    if (!meetingData || !meetingData.roomName || !user) return;

    const domain = meetingData.domain;
    const options = {
      roomName: meetingData.roomName,
      width: '100%',
      height: '700px',
      parentNode: jitsiContainer.current,
      userInfo: {
        displayName: user.name,
        email: user.email,
        avatar: user.profileImageUrl || '',
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'fullscreen',
          'fodeviceselection', 'profile', 'chat',
          'recording', 'livestreaming', 'sharedvideo',
          'settings', 'raisehand', 'videoquality', 'tileview',
          'mute-everyone'
        ],
      },
    };

    const initJitsi = () => {
      if (window.JitsiMeetExternalAPI && !jitsiApiRef.current) {
        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        // Set meeting as initialized when Jitsi is ready
        setIsMeetingInitialized(true);
      }
    };

    if (!window.JitsiMeetExternalAPI && !scriptLoaded) {
      const script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
        initJitsi();
      };
      scriptRef.current = script;
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    return () => {
      cleanupJitsi();
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      setIsMeetingInitialized(false);
    };
  }, [meetingData, user]);

  const handleLeaveMeeting = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setMeetingData(null);
    setRoomName('');
    setHasJoined(false);
    setIsMeetingInitialized(false);
    if (urlRoom) navigate('/chat');
  };

  return (
    <DashboardLayout activeMenu="Meet">
      <div className="p-4">
        {!meetingData ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">
              {urlRoom ? 'Joining Meeting' : 'Start a New Meeting'}
            </h2>
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            {!urlRoom && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room name"
                />
              </div>
            )}
            <button
              onClick={startMeeting}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading 
                ? urlRoom 
                  ? 'Joining Meeting...' 
                  : 'Creating Meeting...'
                : urlRoom
                  ? 'Join Meeting'
                  : 'Start Meeting'}
            </button>
          </div>
        ) : (
          <div ref={videoContainerRef} className="relative">
            {/* Loading overlay */}
            {!isMeetingInitialized && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#ffffff',
                zIndex: 9999
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#407BFF', fontSize: '1.2rem' }}>Setting up your meeting...</p>
                </div>
              </div>
            )}

            {/* Meeting UI elements - only shown when meeting is initialized */}
            {isMeetingInitialized && (
              <>
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                  {user.name}
                </div>
                <div 
                  className={`absolute bottom-4 left-4 z-50 transition-opacity duration-300 ${
                    showLeaveButton ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    onClick={handleLeaveMeeting}
                    className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                    title="Leave Meeting"
                  >
                    <FaPhoneSlash className="text-lg" />
                  </button>
                </div>
              </>
            )}

            {/* Jitsi container - always present but hidden behind loading overlay */}
            <div ref={jitsiContainer} className="rounded-lg overflow-hidden" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Meet;