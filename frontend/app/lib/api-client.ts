import { convertFloat32ArrayToInt16Array } from './audio-utils';
import { z } from 'zod';

// Define Zod schemas for API responses
const RoomResponseSchema = z.object({
  roomId: z.string(),
});

const Language = z.object({
  code: z.string(),
  name: z.string(),
});
const LanguagesResponseSchema = z.array(Language);

// Extract TypeScript types from Zod schemas
type RoomResponse = z.infer<typeof RoomResponseSchema>;
export type AvailableLanguages = z.infer<typeof LanguagesResponseSchema>;

export class ApiClient {
  public roomId: string;
  private baseUrl: string;

  constructor() {
    this.roomId = '';
    this.baseUrl = import.meta.env.VITE_SERVER_URL;
  }

  public async createRoom(): Promise<RoomResponse> {
    try {
      const response = await fetch(this.baseUrl + '/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      const data = RoomResponseSchema.parse(rawData);
      this.roomId = data.roomId;
      return data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Response validation failed:', error.errors);
        throw new Error('Invalid response format from server');
      }
      console.error(error);
      throw error;
    }
  }

  public async postAudio(audio: Float32Array, isUtterance: boolean = false) {
    try {
      const int16Array = convertFloat32ArrayToInt16Array(audio);

      const response = await fetch(
        `${this.baseUrl}/rooms/${this.roomId}?is_utterance=${isUtterance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: int16Array.buffer,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      return rawData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Response validation failed:', error.errors);
        throw new Error('Invalid response format from server');
      }
      console.error(error);
      throw error;
    }
  }

  public async getAvailableLanguages(): Promise<AvailableLanguages> {
    try {
      const response = await fetch(this.baseUrl + '/languages');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      const data = LanguagesResponseSchema.parse(rawData);
      return data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Response validation failed:', error.errors);
        throw new Error('Invalid response format from server');
      }
      console.error(error);
      throw error;
    }
  }

  public async wakeUp() {
    try {
      const response = await fetch(this.baseUrl + '/wake-up');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
