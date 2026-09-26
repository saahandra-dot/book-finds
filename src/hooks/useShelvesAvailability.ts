import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

// null means the device check has not finished yet.
export function useShelvesAvailability(): boolean | null {
    const { width } = useWindowDimensions();
    const [deviceType, setDeviceType] = useState<number | null>(
        Device.deviceType
    );

    useEffect(() => {
        if (deviceType !== null) {
            return;
        }

        let active = true;

        Device.getDeviceTypeAsync()
            .then((result) => {
                if (active) {
                    setDeviceType(result);
                }
            })
            .catch(() => {
                if (active) {
                    setDeviceType(Device.DeviceType.UNKNOWN);
                }
            });

        return () => {
            active = false;
        };
    }, [deviceType]);

    if (deviceType === null) {
        return null;
    }

    return deviceType === Device.DeviceType.TABLET && width >= 700;
}