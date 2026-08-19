import qrcode

network_name = input("Network name: ")
password = input("Your password: ")

qr_key = f"WIFI:T:WPA;S:{network_name};P:{password};;"

img = qrcode.make(qr_key)
img.save("wifi_qr.png")

print("WIFI QR code created.")