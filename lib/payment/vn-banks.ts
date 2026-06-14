// Danh sách ngân hàng VN (tên + BIN + logo) — nguồn VietQR (api.vietqr.io/v2/banks).
// Sinh tĩnh để chọn ngân hàng + hiển thị logo khi cấu hình tài khoản nhận tiền. ADR 0009.

export interface VnBank {
  code: string;
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export const VN_BANKS: VnBank[] = [
  {
    "code": "ABB",
    "bin": "970425",
    "shortName": "ABBANK",
    "name": "Ngân hàng TMCP An Bình",
    "logo": "https://cdn.vietqr.io/img/ABB.png"
  },
  {
    "code": "ACB",
    "bin": "970416",
    "shortName": "ACB",
    "name": "Ngân hàng TMCP Á Châu",
    "logo": "https://cdn.vietqr.io/img/ACB.png"
  },
  {
    "code": "VBA",
    "bin": "970405",
    "shortName": "Agribank",
    "name": "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
    "logo": "https://cdn.vietqr.io/img/VBA.png"
  },
  {
    "code": "BAB",
    "bin": "970409",
    "shortName": "BacABank",
    "name": "Ngân hàng TMCP Bắc Á",
    "logo": "https://cdn.vietqr.io/img/BAB.png"
  },
  {
    "code": "BVB",
    "bin": "970438",
    "shortName": "BaoVietBank",
    "name": "Ngân hàng TMCP Bảo Việt",
    "logo": "https://cdn.vietqr.io/img/BVB.png"
  },
  {
    "code": "BIDV",
    "bin": "970418",
    "shortName": "BIDV",
    "name": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    "logo": "https://cdn.vietqr.io/img/BIDV.png"
  },
  {
    "code": "CAKE",
    "bin": "546034",
    "shortName": "CAKE",
    "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank",
    "logo": "https://cdn.vietqr.io/img/CAKE.png"
  },
  {
    "code": "CIMB",
    "bin": "422589",
    "shortName": "CIMB",
    "name": "Ngân hàng TNHH MTV CIMB Việt Nam",
    "logo": "https://cdn.vietqr.io/img/CIMB.png"
  },
  {
    "code": "COOPBANK",
    "bin": "970446",
    "shortName": "COOPBANK",
    "name": "Ngân hàng Hợp tác xã Việt Nam",
    "logo": "https://cdn.vietqr.io/img/COOPBANK.png"
  },
  {
    "code": "EIB",
    "bin": "970431",
    "shortName": "Eximbank",
    "name": "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
    "logo": "https://cdn.vietqr.io/img/EIB.png"
  },
  {
    "code": "HDB",
    "bin": "970437",
    "shortName": "HDBank",
    "name": "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh",
    "logo": "https://cdn.vietqr.io/img/HDB.png"
  },
  {
    "code": "KBank",
    "bin": "668888",
    "shortName": "KBank",
    "name": "Ngân hàng Đại chúng TNHH Kasikornbank",
    "logo": "https://cdn.vietqr.io/img/KBANK.png"
  },
  {
    "code": "KLB",
    "bin": "970452",
    "shortName": "KienLongBank",
    "name": "Ngân hàng TMCP Kiên Long",
    "logo": "https://cdn.vietqr.io/img/KLB.png"
  },
  {
    "code": "LPB",
    "bin": "970449",
    "shortName": "LPBank",
    "name": "Ngân hàng TMCP Lộc Phát Việt Nam",
    "logo": "https://cdn.vietqr.io/img/LPB.png"
  },
  {
    "code": "MB",
    "bin": "970422",
    "shortName": "MBBank",
    "name": "Ngân hàng TMCP Quân đội",
    "logo": "https://cdn.vietqr.io/img/MB.png"
  },
  {
    "code": "MBV",
    "bin": "970414",
    "shortName": "MBV",
    "name": "Ngân hàng TNHH MTV Việt Nam Hiện Đại",
    "logo": "https://cdn.vietqr.io/img/MBV.png"
  },
  {
    "code": "momo",
    "bin": "971025",
    "shortName": "MoMo",
    "name": "CTCP Dịch Vụ Di Động Trực Tuyến",
    "logo": "https://cdn.vietqr.io/img/momo.png"
  },
  {
    "code": "MSB",
    "bin": "970426",
    "shortName": "MSB",
    "name": "Ngân hàng TMCP Hàng Hải Việt Nam",
    "logo": "https://cdn.vietqr.io/img/MSB.png"
  },
  {
    "code": "NAB",
    "bin": "970428",
    "shortName": "NamABank",
    "name": "Ngân hàng TMCP Nam Á",
    "logo": "https://cdn.vietqr.io/img/NAB.png"
  },
  {
    "code": "NCB",
    "bin": "970419",
    "shortName": "NCB",
    "name": "Ngân hàng TMCP Quốc Dân",
    "logo": "https://cdn.vietqr.io/img/NCB.png"
  },
  {
    "code": "OCB",
    "bin": "970448",
    "shortName": "OCB",
    "name": "Ngân hàng TMCP Phương Đông",
    "logo": "https://cdn.vietqr.io/img/OCB.png"
  },
  {
    "code": "PGB",
    "bin": "970430",
    "shortName": "PGBank",
    "name": "Ngân hàng TMCP Thịnh vượng và Phát triển",
    "logo": "https://cdn.vietqr.io/img/PGB.png"
  },
  {
    "code": "PVCB",
    "bin": "970412",
    "shortName": "PVcomBank",
    "name": "Ngân hàng TMCP Đại Chúng Việt Nam",
    "logo": "https://cdn.vietqr.io/img/PVCB.png"
  },
  {
    "code": "PVDB",
    "bin": "971133",
    "shortName": "PVcomBank Pay",
    "name": "Ngân hàng TMCP Đại Chúng Việt Nam Ngân hàng số",
    "logo": "https://cdn.vietqr.io/img/PVCB.png"
  },
  {
    "code": "STB",
    "bin": "970403",
    "shortName": "Sacombank",
    "name": "Ngân hàng TMCP Sài Gòn Thương Tín",
    "logo": "https://cdn.vietqr.io/img/STB.png"
  },
  {
    "code": "SGICB",
    "bin": "970400",
    "shortName": "SaigonBank",
    "name": "Ngân hàng TMCP Sài Gòn Công Thương",
    "logo": "https://cdn.vietqr.io/img/SGICB.png"
  },
  {
    "code": "SCB",
    "bin": "970429",
    "shortName": "SCB",
    "name": "Ngân hàng TMCP Sài Gòn",
    "logo": "https://cdn.vietqr.io/img/SCB.png"
  },
  {
    "code": "SEAB",
    "bin": "970440",
    "shortName": "SeABank",
    "name": "Ngân hàng TMCP Đông Nam Á",
    "logo": "https://cdn.vietqr.io/img/SEAB.png"
  },
  {
    "code": "SHB",
    "bin": "970443",
    "shortName": "SHB",
    "name": "Ngân hàng TMCP Sài Gòn - Hà Nội",
    "logo": "https://cdn.vietqr.io/img/SHB.png"
  },
  {
    "code": "SHBVN",
    "bin": "970424",
    "shortName": "ShinhanBank",
    "name": "Ngân hàng TNHH MTV Shinhan Việt Nam",
    "logo": "https://cdn.vietqr.io/img/SHBVN.png"
  },
  {
    "code": "TCB",
    "bin": "970407",
    "shortName": "Techcombank",
    "name": "Ngân hàng TMCP Kỹ thương Việt Nam",
    "logo": "https://cdn.vietqr.io/img/TCB.png"
  },
  {
    "code": "TIMO",
    "bin": "963388",
    "shortName": "Timo",
    "name": "Ngân hàng số Timo by Ban Viet Bank (Timo by Ban Viet Bank)",
    "logo": "https://vietqr.net/portal-service/resources/icons/TIMO.png"
  },
  {
    "code": "TPB",
    "bin": "970423",
    "shortName": "TPBank",
    "name": "Ngân hàng TMCP Tiên Phong",
    "logo": "https://cdn.vietqr.io/img/TPB.png"
  },
  {
    "code": "Ubank",
    "bin": "546035",
    "shortName": "Ubank",
    "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank",
    "logo": "https://cdn.vietqr.io/img/UBANK.png"
  },
  {
    "code": "VIB",
    "bin": "970441",
    "shortName": "VIB",
    "name": "Ngân hàng TMCP Quốc tế Việt Nam",
    "logo": "https://cdn.vietqr.io/img/VIB.png"
  },
  {
    "code": "VAB",
    "bin": "970427",
    "shortName": "VietABank",
    "name": "Ngân hàng TMCP Việt Á",
    "logo": "https://cdn.vietqr.io/img/VAB.png"
  },
  {
    "code": "VIETBANK",
    "bin": "970433",
    "shortName": "VietBank",
    "name": "Ngân hàng TMCP Việt Nam Thương Tín",
    "logo": "https://cdn.vietqr.io/img/VIETBANK.png"
  },
  {
    "code": "VCCB",
    "bin": "970454",
    "shortName": "VietCapitalBank",
    "name": "Ngân hàng TMCP Bản Việt",
    "logo": "https://cdn.vietqr.io/img/VCCB.png"
  },
  {
    "code": "VCB",
    "bin": "970436",
    "shortName": "Vietcombank",
    "name": "Ngân hàng TMCP Ngoại Thương Việt Nam",
    "logo": "https://cdn.vietqr.io/img/VCB.png"
  },
  {
    "code": "ICB",
    "bin": "970415",
    "shortName": "VietinBank",
    "name": "Ngân hàng TMCP Công thương Việt Nam",
    "logo": "https://cdn.vietqr.io/img/ICB.png"
  },
  {
    "code": "VPB",
    "bin": "970432",
    "shortName": "VPBank",
    "name": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    "logo": "https://cdn.vietqr.io/img/VPB.png"
  },
  {
    "code": "WVN",
    "bin": "970457",
    "shortName": "Woori",
    "name": "Ngân hàng TNHH MTV Woori Việt Nam",
    "logo": "https://cdn.vietqr.io/img/WVN.png"
  }
];

const BY_SHORT = new Map(VN_BANKS.map((b) => [b.shortName, b]));

// Tra ngân hàng theo shortName (giá trị lưu ở bank_name).
export function findBank(shortName: string | null | undefined): VnBank | null {
  if (!shortName) return null;
  return BY_SHORT.get(shortName) ?? null;
}
