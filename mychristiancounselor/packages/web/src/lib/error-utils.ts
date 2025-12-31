/**
 * Parse error message from an API response
 * @param response - The fetch Response object
 * @param defaultMessage - Default error message if parsing fails
 * @returns The parsed error message
 */
export async function parseErrorMessage(
  response: Response,
  defaultMessage: string
): Promise<string> {
  try {
    const data = await response.json();
    return data.message || defaultMessage;
  } catch {
    return defaultMessage;
  }
}
