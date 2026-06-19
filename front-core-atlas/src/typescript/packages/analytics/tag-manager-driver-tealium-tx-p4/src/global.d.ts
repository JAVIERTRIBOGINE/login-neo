interface Window {
  bsSend?<T>(type: string, tealiumData: T): void;
  bsSendExperience?<T>(tealiumData: T): unknown;
}
