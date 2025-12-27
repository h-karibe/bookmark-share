import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

export interface ShareData {
  title: string;
  url: string;
  description?: string;
}

export const generateShareUrls = (data: ShareData) => {
  const text = data.description
    ? `${data.title} - ${data.description}`
    : data.title;

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(data.url);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    line: `https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + data.url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const getShareableUrl = (listId: string): string => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/public-list-detail?listId=${listId}`;
  }

  const baseUrl = 'https://yourapp.com';
  return `${baseUrl}/public-list-detail?listId=${listId}`;
};

export const getBookShareableUrl = (isbn: string): string => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/book-detail?isbn=${encodeURIComponent(isbn)}`;
  }

  const baseUrl = 'https://yourapp.com';
  return `${baseUrl}/book-detail?isbn=${encodeURIComponent(isbn)}`;
};
