import { Capacitor } from "@capacitor/core";

export type BluetoothSerialDevice = {
  id?: string;
  address?: string;
  name?: string;
  class?: number;
};

type BluetoothSerial = {
  isEnabled: (success: () => void, failure: (err: unknown) => void) => void;
  enable: (success: () => void, failure: (err: unknown) => void) => void;
  connect: (address: string, success: () => void, failure: (err: unknown) => void) => void;
  disconnect: (success?: () => void, failure?: (err: unknown) => void) => void;
  write: (data: string | ArrayBuffer, success: () => void, failure: (err: unknown) => void) => void;
  isConnected: (success: () => void, failure: () => void) => void;
  list: (success: (devices: BluetoothSerialDevice[]) => void, failure: (err: unknown) => void) => void;
};

function getBluetoothSerial(): BluetoothSerial {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("BluetoothSerial hanya tersedia di Android/iOS (native)");
  }

  const anyWindow = window as any;
  const bluetoothSerial = anyWindow?.bluetoothSerial as BluetoothSerial | undefined;
  if (!bluetoothSerial) {
    throw new Error("Plugin bluetoothSerial tidak ditemukan. Pastikan cordova-plugin-bluetooth-serial sudah terpasang & cap sync sudah dijalankan.");
  }
  return bluetoothSerial;
}

function wrapVoid(fn: (ok: () => void, fail: (err: unknown) => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(resolve, reject);
  });
}

function wrapConnect(fn: (address: string, ok: () => void, fail: (err: unknown) => void) => void, address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(address, resolve, reject);
  });
}

export async function bluetoothEnsureEnabled(): Promise<void> {
  const bluetoothSerial = getBluetoothSerial();

  try {
    await new Promise<void>((resolve, reject) => {
      bluetoothSerial.isEnabled(
        () => resolve(),
        async () => {
          try {
            await wrapVoid(bluetoothSerial.enable);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("permission") || msg.includes("Permission") || msg.includes("SecurityException")) {
      throw new Error("Permission Bluetooth belum diberikan. Buka Settings aplikasi, izinkan permission Bluetooth, lalu coba lagi.");
    }
    throw err;
  }
}

export async function bluetoothPrintEscPos(address: string, escpos: string): Promise<void> {
  const bluetoothSerial = getBluetoothSerial();

  try {
    await bluetoothEnsureEnabled();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("permission") || msg.includes("Permission") || msg.includes("SecurityException") || msg.includes("BLUETOOTH")) {
      throw new Error("Permission Bluetooth belum diberikan. Buka Settings HP → Apps → KandangBiru → Permissions, lalu izinkan Bluetooth (Nearby devices).");
    }
    throw new Error(`Gagal mengaktifkan Bluetooth: ${msg}`);
  }

  try {
    await wrapConnect(bluetoothSerial.connect, address);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("permission") || msg.includes("Permission") || msg.includes("SecurityException") || msg.includes("BLUETOOTH")) {
      throw new Error("Permission Bluetooth belum diberikan. Buka Settings HP → Apps → KandangBiru → Permissions, lalu izinkan Bluetooth (Nearby devices).");
    }
    throw new Error(`Gagal konek ke printer (${address}): ${msg}`);
  }

  try {
    // Kirim data dalam chunks untuk menghindari buffer overflow
    const chunkSize = 700;
    for (let i = 0; i < escpos.length; i += chunkSize) {
      const chunk = escpos.slice(i, i + chunkSize);
      await wrapVoid((ok, fail) => bluetoothSerial.write(chunk, ok, fail));
      // Delay kecil antar chunk untuk stabil
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gagal mengirim data ke printer: ${msg}`);
  } finally {
    try {
      bluetoothSerial.disconnect();
    } catch {
      // ignore
    }
  }
}
