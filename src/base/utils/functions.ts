/**
 * Tạo số ngẫu nhiên trong khoảng [min, max]
 * @param min Giá trị nhỏ nhất
 * @param max Giá trị lớn nhất
 * @returns Số ngẫu nhiên
 */
export function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Tạo chuỗi chữ cái ngẫu nhiên với độ dài xác định
 * @param stringLength Độ dài chuỗi cần tạo
 * @returns Chuỗi chữ cái ngẫu nhiên
 */
export const randomAlphabet = (stringLength: number) => {
  let randomString = '';

  const rd = () => {
    let rd = random(65, 122);
    if (90 < rd && rd < 97) rd += 10;
    return rd;
  };

  while (stringLength--) randomString += String.fromCharCode(rd());
  return randomString;
};
