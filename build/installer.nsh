!macro customInit
  ; Убиваем процессы перед установкой/обновлением
  DetailPrint "Stopping running processes..."
  nsExec::Exec "taskkill /F /IM 'DPI Dashboard.exe' /T"
  nsExec::Exec "taskkill /F /IM 'winws.exe' /T"
  nsExec::Exec "taskkill /F /IM 'tg_ws_proxy.exe' /T"
  Sleep 1000
!macroend

!macro customUnInstall
  ; Убиваем процессы перед удалением
  nsExec::Exec "taskkill /F /IM 'DPI Dashboard.exe' /T"
  nsExec::Exec "taskkill /F /IM 'winws.exe' /T"
  nsExec::Exec "taskkill /F /IM 'tg_ws_proxy.exe' /T"
!macroend
