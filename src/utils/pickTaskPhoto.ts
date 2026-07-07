import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToR2 } from '../services/uploadService';

// Uploads the picked evidence photo to R2 and returns the resulting object
// key for the store to hold in Task.completionPhotoUrl — previously this
// only returned the local device URI, which meant a parent on a different
// device could never actually see the photo their kid attached.
async function uploadOrAlert(localUri: string): Promise<string | null> {
  try {
    return await uploadImageToR2(localUri, 'task-photo');
  } catch {
    Alert.alert('Upload failed', 'Could not upload the photo. Check your connection and try again.');
    return null;
  }
}

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
            if (result.canceled || !result.assets[0]) { resolve(null); return; }
            resolve(await uploadOrAlert(result.assets[0].uri));
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'] as ImagePicker.MediaType[],
              quality: 0.6,
            });
            if (result.canceled || !result.assets[0]) { resolve(null); return; }
            resolve(await uploadOrAlert(result.assets[0].uri));
          },
        },
        { text: 'Skip', style: 'cancel', onPress: () => resolve(null) },
      ],
    );
  });
}
