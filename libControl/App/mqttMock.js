// Extracted from index.html so the whole app compiles into one bundle.
// Standalone stand-ins for the MQTT-backed state used in the OpenAir rig.
        // --- Standalone Mocks for MQTT environment ---

        const globalStore = {};
        const globalListeners = {};
        
        window.useMqttState = function(topic, defaultState) {
            const cacheKey = 'mqtt_cache_' + topic;
            if (!(topic in globalStore)) {
                try {
                    const cached = localStorage.getItem(cacheKey);
                    globalStore[topic] = cached ? JSON.parse(cached) : defaultState;
                } catch (e) {
                    globalStore[topic] = defaultState;
                }
            }
            const [state, setState] = React.useState(globalStore[topic]);
            
            React.useEffect(() => {
                if (!globalListeners[topic]) {
                    globalListeners[topic] = new Set();
                }
                const listener = (newVal) => setState(newVal);
                globalListeners[topic].add(listener);
                return () => globalListeners[topic].delete(listener);
            }, [topic]);

            const setGlobalState = React.useCallback((newVal) => {
                const nextVal = typeof newVal === 'function' ? newVal(globalStore[topic]) : newVal;
                globalStore[topic] = nextVal;
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(nextVal));
                } catch (e) {}
                if (globalListeners[topic]) {
                    globalListeners[topic].forEach(l => l(nextVal));
                }
            }, [topic]);

            return [state, setGlobalState];
        };

        // useMqttMessages: returns empty map, used for remembering samples
        window.useMqttMessages = function() {
            return {};
        };

        // useMqttPublish: no-op since there's no MQTT broker
        window.useMqttPublish = function() {
            return function(topic, payload) {
                console.log('Mock publish:', topic, payload);
            };
        };
