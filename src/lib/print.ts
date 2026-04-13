import { Capacitor } from "@capacitor/core";
import QRCode from "qrcode";

export interface PrintTemplateData {
  id: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  items: Array<{
    quantity: number;
    variant: {
      unit: string;
      sellingPrice: number;
    };
    product: {
      name: string;
    };
  }>;
  total: number;
  discount?: number;
  serviceCharge?: number;
  ppn?: number;
  ppnPercentage?: number;
}

export interface PrintSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeFooter?: string;
  qrCodeLink?: string;
  showQRCode?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export async function print(
  data: PrintTemplateData,
  settings: PrintSettings
): Promise<string> {
  const storeName = settings.storeName || "TOKO PAKAN TERNAK";
  const storeAddress = settings.storeAddress || "Jl. Peternakan No.22 Ngalor Ngidul, Kec. Nganjuk";
  const storePhone = settings.storePhone || "0812-3456-7890";
  const storeFooter = settings.storeFooter || "Terima kasih telah berbelanja";
  const qrCodeLink = settings.qrCodeLink || "";
  const showQRCode = settings.showQRCode || false;

  // Generate QR code as base64 image (works on both web and Android)
  let qrCodeImageBase64 = "";
  if (showQRCode && qrCodeLink) {
    try {
      qrCodeImageBase64 = await QRCode.toDataURL(qrCodeLink, {
        width: 70,
        margin: 1,
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  }

  const html = `<!DOCTYPE html>
<html><head><title>Struk</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page{size:70mm auto;margin:1mm;}
  body{width:70mm;margin:0 auto;padding:2mm;font-family:'Poppins',sans-serif;font-size:11px;line-height:1.6;color:#000;background:#fff}
  .c{text-align:center}.b{font-weight:600}.d{border-top:1px dashed #000;margin:3px 0}
  table{width:100%;border-collapse:collapse}td{padding:1px 0;font-size:10px;vertical-align:top}.r{text-align:right}
  #qrcode{display:flex;justify-content:center;margin-top:4px;}
  #qrcode img{width:70px;height:70px}
</style></head>
<body>
<div class="c b" style="font-size:14px">${storeName}</div>
<div class="c" style="font-size:9px">${storeAddress}</div>
<div class="c" style="font-size:9px">Telp: ${storePhone}</div>
<div class="d"></div>
<table style="font-size:9px">
  <tr><td style="width:60px">No ID</td><td>: ${data.id}</td></tr>
  <tr><td>Tanggal</td><td>: ${new Date(data.date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false})}</td></tr>
  <tr><td>Pelanggan</td><td>: ${data.customerName}</td></tr>
</table>
<div class="d"></div>
<table style="font-size:9px; border-collapse: collapse; width: 100%">
${data.items.map((item) => `<tr>
  <td style="width:7px; padding-right: 5px; text-align: left">${item.quantity}</td>
  <td style="width:30px; padding-right: 5px">${item.variant.unit}</td>
  <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.product.name.toLowerCase()}</td>
  <td class="r" style="padding-left: 10px">${formatCurrency(item.variant.sellingPrice * item.quantity)}</td>
</tr>`).join("")}
</table>
<div class="d"></div>
<table>
  ${(() => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.variant.sellingPrice * item.quantity), 0);
    return `
  <tr><td>Subtotal</td><td class="r">${formatCurrency(subtotal)}</td></tr>
  ${data.discount && data.discount > 0 ? `<tr><td style="color:red">Diskon</td><td class="r" style="color:red">-${formatCurrency(data.discount)}</td></tr>` : ""}
  ${data.serviceCharge && data.serviceCharge > 0 ? `<tr><td>Biaya Layanan</td><td class="r">+${formatCurrency(data.serviceCharge)}</td></tr>` : ""}
  ${data.ppn && data.ppn > 0 ? `<tr><td>PPN (${data.ppnPercentage}%)</td><td class="r">+${formatCurrency(data.ppn)}</td></tr>` : ""}
  <tr class="b"><td>TOTAL</td><td class="r">${formatCurrency(data.total)}</td></tr>`;
  })()}
</table>
<div class="d"></div>
<table style="font-size:9px">
  <tr><td>Metode Pembayaran</td><td class="r">${data.paymentMethod.toUpperCase()}</td></tr>
</table>
<div class="d"></div>
<div class="c" style="font-size:9px;margin-top:10px">${storeFooter}</div>
${qrCodeImageBase64 ? `<div id="qrcode"><img src="${qrCodeImageBase64}" width="70" height="70" alt="QR Code" /></div>` : ""}
<script>
  window.onload=function(){
    ${!Capacitor.isNativePlatform() ? `
    setTimeout(function(){
      try { window.focus(); } catch(e) {}
      try { window.print(); } catch(e) {}
    }, 300);
    ` : ""}
  };
</script>
</body></html>`;

  return html;
}
