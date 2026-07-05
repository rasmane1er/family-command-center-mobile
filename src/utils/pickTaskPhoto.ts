import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Local-only evidence photo for task-approval submissions — no backend
// upload endpoint exists for this (unlike ReceiptScannerScreen's OCR
// flow), so this just returns the picked image's local URI for the store
// to hold in Task.completionPhotoUrl.
export async function pickTaskCompletionPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add a photo',
      'Show a picture of the finished task as proof.',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission needed', 'Camera permission is needed to take a photo.');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'] as ImagePicker.MediaType[],
              quality: 0.6,
            });
            resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'] as ImagePicker.MediaType[],
              quality: 0.6,
            });
            resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
          },
        },
        { text: 'Skip', style: 'cancel', onPress: () => resolve(null) },
      ],
    );
  });
}
