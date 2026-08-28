import os
import time
from datetime import datetime

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_hora():
    return datetime.now().strftime("%d/%m/%Y - %H:%M:%S")

while True:
    try:
        
        numero_1 = float(input("Digite algum número: "))
        numero_2 = float(input("Digite algum número aqui também: "))
        resultado = numero_1 + numero_2
        print(f"O resultado da conta é {resultado} | Calculo feito em {mostrar_hora()}")
    except ValueError:
        print("Digite apenas números intei ")
        time.sleep(1.2)
        limpar_tela()