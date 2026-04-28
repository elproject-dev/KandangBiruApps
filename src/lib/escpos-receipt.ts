import type { PrintSettings, PrintTemplateData } from "@/lib/print";

function formatCurrency(amount: number): string {
  const s = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return "Rp." + s.replace(/\./g, ".");
}

function padLeft(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len);
  return " ".repeat(len - s.length) + s;
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

function wrapText(s: string, maxLen: number): string[] {
  if (s.length <= maxLen) return [s];
  const lines: string[] = [];
  let current = "";
  const words = s.split(" ");

  for (const word of words) {
    if (current.length + word.length + 1 <= maxLen) {
      current += (current ? " " : "") + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

export function removeEscapeSequences(escpos: string): string {
  // Hapus semua escape sequences ESC/POS untuk preview
  let cleaned = escpos
    .replace(/\x1B[@A-Z\[\]^_\\]/g, "") // ESC commands
    .replace(/\x1D[@A-Z\[\]^_\\]/g, "") // GS commands
    .replace(/\x1B\x33[\x00-\xFF]/g, "") // Line spacing (ESC 3 n)
    .replace(/\x1D\x21[\x00-\xFF]/g, "") // Font size (GS ! n)
    .replace(/\x1D\x56[\x00-\xFF]/g, "") // Cut (GS V n)
    .replace(/\x1B\x45[\x00-\x01]/g, "") // Bold on/off
    .replace(/\x1B\x61[\x00-\x02]/g, "") // Alignment
    .replace(/\x1D[\x00-\xFF]/g, "") // Remove remaining GS commands
    .replace(/\x1B[\x00-\xFF]/g, ""); // Remove remaining ESC commands

  // Hapus semua karakter non-printable (ASCII < 32) kecuali newline (10) dan carriage return (13)
  cleaned = cleaned.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, "");

  return cleaned;
}

function line(width: number): string {
  return "=".repeat(width);
}

function center(text: string, width: number): string {
  const clean = text.trim().toUpperCase();
  if (clean.length >= width) return clean.slice(0, width);

  const space = width - clean.length;
  const left = Math.floor(space / 2);
  const right = space - left;

  return " ".repeat(left) + clean + " ".repeat(right);
}

function centerNoCase(text: string, width: number): string {
  const clean = text.trim();
  if (clean.length >= width) return clean.slice(0, width);

  const space = width - clean.length;
  const left = Math.floor(space / 2);
  const right = space - left;

  return " ".repeat(left) + clean + " ".repeat(right);
}

export function buildEscPosReceipt(
  data: PrintTemplateData,
  settings: PrintSettings
): string {
  // 🔥 Lebih aman untuk 58mm
  const width = 32;

  const storeName = settings.storeName || "TOKO PAKAN TERNAK";
  const storeAddress = settings.storeAddress || "";
  const storePhone = settings.storePhone || "";
  const storeFooter = settings.storeFooter || "";

  const dateText = new Date(data.date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // ESC/POS commands
  const init = "\x1B\x40";
  const alignCenter = "\x1B\x61\x01";
  const alignLeft = "\x1B\x61\x00";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";
  const normalSize = "\x1D\x21\x00";
  const lineSpacing = "\x1B\x33\x22"; // Line spacing 24/360 inch (seimbang, tidak terlalu jauh/dekat)
  const cut = "\x1D\x56\x00";

  let out = "";
  out += init;
  out += lineSpacing;
  out += normalSize;

  // ================= HEADER =================
  out += alignCenter;
  out += "\n"; // Tambah 1 baris kosong di atas agar tidak terpotong
  out += boldOn + center(storeName, width) + boldOff + "\n";

  if (storeAddress) {
    const addressLines = wrapText(storeAddress, width);
    for (const line of addressLines) {
      out += centerNoCase(line, width) + "\n";
    }
  }
  if (storePhone) out += centerNoCase("Telp: " + storePhone, width) + "\n";
  // ================= INFO =================
  out += alignLeft;
  out += line(width) + "\n";
  out += "No ID     : " + data.id + "\n";
  out += "Tanggal   : " + dateText + "\n";
  out += "Pelanggan : " + (data.customerName || "-") + "\n";
  out += line(width) + "\n";

  // ================= ITEMS =================
  for (const item of data.items) {
    const qty = item.quantity;
    const unit = item.variant.unit;
    const name = truncate(item.product.name, 18);
    const total = formatCurrency(
      item.variant.sellingPrice * item.quantity
    );

    // Satu baris: qty + unit + nama + harga (rata kanan)
    const qtyUnitStr = `${qty} ${unit} `;
    const nameStr = name;
    const totalStr = total;

    let line = qtyUnitStr + nameStr;
    const remainingSpace = width - line.length - totalStr.length;

    if (remainingSpace > 0) {
      line += " ".repeat(remainingSpace) + totalStr;
    } else {
      // Kurangi nama produk jika space tidak cukup
      const maxNameLen = width - qtyUnitStr.length - totalStr.length - 1;
      const truncatedName = truncate(name, maxNameLen > 0 ? maxNameLen : 5);
      line = qtyUnitStr + truncatedName + " " + totalStr;
    }

    out += line + "\n";
  }

  out += line(width) + "\n";

  // ================= SUMMARY =================
  const subtotal = data.items.reduce(
    (sum, item) =>
      sum + item.variant.sellingPrice * item.quantity,
    0
  ) ;


  const rows: Array<[string, string]> = [];
  rows.push(["Subtotal", formatCurrency(subtotal)]);

  if (data.discount && data.discount > 0) {
    rows.push(["Diskon", "-" + formatCurrency(data.discount)]);
  }

  if (data.serviceCharge && data.serviceCharge > 0) {
    rows.push([
      "Biaya Layanan",
      "+" + formatCurrency(data.serviceCharge),
    ]);
  }

  if (data.ppn && data.ppn > 0) {
    rows.push([
      `PPN(${data.ppnPercentage}%)`,
      "+" + formatCurrency(data.ppn),
    ]);
  }

  rows.push(["GRAND TOTAL", formatCurrency(data.total)]);

  for (const [label, value] of rows) {
    const space = width - label.length - value.length;
    const spaceStr = space > 0 ? " ".repeat(space) : " ";
    out += label + spaceStr + value + "\n";
  }

  out += line(width) + "\n";
  const paymentLabel = "Pembayaran";
  const paymentValue = (data.paymentMethod || "").toUpperCase();
  const paymentSpace = width - paymentLabel.length - paymentValue.length;
  const paymentSpaceStr = paymentSpace > 0 ? " ".repeat(paymentSpace) : " ";
  out += paymentLabel + paymentSpaceStr + paymentValue + "\n";
  out += line(width) + "\n";

  // ================= FOOTER =================
  out += alignCenter;

  if (storeFooter) {
    out += centerNoCase(storeFooter, width) + "\n";
  } else {
    out += centerNoCase("Terima Kasih", width) + "\n";
  }

  out += "\n\n\n"; // biar tidak kepotong
  out += cut;

  return out;
}