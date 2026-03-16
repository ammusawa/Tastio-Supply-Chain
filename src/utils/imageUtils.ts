/**
 * Utility function to get the full image URL
 * @param imageUrl - The image URL from the backend
 * @returns The full image URL with backend base URL if needed
 */
export function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it's a relative path, prepend the backend URL
  return `http://localhost:8000${imageUrl}`;
}
