import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Mic } from 'lucide-react';

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

interface DeviceSelectProps {
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  disabled?: boolean;
}

export function DeviceSelect({
  selectedDevice,
  setSelectedDevice,
  disabled,
}: DeviceSelectProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Get all audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          }));

        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    }

    getDevices();
  }, []);

  return (
    <Select
      value={selectedDevice}
      onValueChange={setSelectedDevice}
      disabled={disabled}
    >
      <SelectTrigger icon={<Mic />}>
        <SelectValue placeholder="Select a device" />
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {device.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
