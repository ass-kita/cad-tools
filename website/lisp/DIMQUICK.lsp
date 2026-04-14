;;; コマンド名: DIMQUICK (エイリアス: DQ)
;;; 手順:
;;; 1. [DQ] 入力
;;; 2. 基点をクリック (補助線が必要な場合はここで 'Y' を入力)
;;; 3. マウスを上下左右に動かして方向を決定しクリック

(defun C:DIMQUICK (/ *error* vars vals base_pt next_pt delta_x delta_y ang d_type ext_pt dim_loc tmp_dist tmp_ext)
  (vl-load-com)

  ;; --- エラーハンドラ (システム変数の復元) ---
  (defun *error* (msg)
    (if (not (member msg '("Function cancelled" "quit / exit abort")))
      (princ (strcat "\nError: " msg))
    )
    (if (and vars vals) (mapcar 'setvar vars vals))
    (vla-endundomark (vla-get-activedocument (vlax-get-acad-object)))
    (princ)
  )

  ;; --- グローバル変数の初期化 (セッション内保持) ---
  (if (null *DQ-DIST*) (setq *DQ-DIST* 1000.0))    ; 初期距離
  (if (null *DQ-EXT*)  (setq *DQ-EXT* "No"))      ; 初期補助線設定

  ;; --- システム変数の保存 ---
  (setq vars '("CMDECHO" "OSMODE" "DIMSE1" "DIMSE2" "ORTHOMODE"))
  (setq vals (mapcar 'getvar vars))
  
  (vla-startundomark (vla-get-activedocument (vlax-get-acad-object)))
  (setvar "CMDECHO" 0)

  ;; --- 1. 基点入力および設定変更 ---
  (initget "Yes")
  (setq base_pt (getpoint (strcat "\n基点を指定 [設定変更(Y)] <距離:" (rtos *DQ-DIST* 2 0) " / 補助線:" *DQ-EXT* ">: ")))
  
  ;; 'Y' が押された場合の可変設定フロー
  (if (= base_pt "Yes")
    (progn
      ;; 距離の入力
      (setq tmp_dist (getdist (strcat "\n作図する寸法値を入力 <" (rtos *DQ-DIST* 2 0) ">: ")))
      (if tmp_dist (setq *DQ-DIST* tmp_dist))
      
      ;; 補助線の有無
      (initget "Yes No")
      (setq tmp_ext (getkword (strcat "\n寸法補助線を作図しますか？ [Yes/No] <" *DQ-EXT* ">: ")))
      (if tmp_ext (setq *DQ-EXT* tmp_ext))

      ;; 設定変更後、そのまま点取得へ
      (setq base_pt (getpoint "\n寸法補助線の基点を指定: "))
    )
  )

  ;; 補助線ありモードの場合の追加入力
  (if (and base_pt (= *DQ-EXT* "Yes"))
    (progn
      (setq ext_pt (getpoint base_pt "\n寸法補助線の終点(計測点)を指定: "))
      (if ext_pt (setq dim_loc (getpoint ext_pt "\n寸法線の配置位置を指定: ")))
    )
  )

  ;; --- 2. 方向選択と作図 ---
  (if (and base_pt (or (= *DQ-EXT* "No") (and ext_pt dim_loc)))
    (progn
      (setvar "OSMODE" 0) ; 方向指定時はスナップを無効化
      (setq next_pt (getpoint base_pt "\n方向を選択 (マウスを移動してクリック): "))
      
      (if next_pt
        (progn
          (setq delta_x (- (car next_pt) (car base_pt)))
          (setq delta_y (- (cadr next_pt) (cadr base_pt)))

          ;; 方向判定 (絶対値比較による4方向分岐)
          (cond
            ((and (>= (abs delta_x) (abs delta_y)) (> delta_x 0)) (setq ang 0.0))
            ((and (>= (abs delta_x) (abs delta_y)) (< delta_x 0)) (setq ang pi))
            ((and (> (abs delta_y) (abs delta_x)) (> delta_y 0)) (setq ang (/ pi 2.0)))
            ((and (> (abs delta_y) (abs delta_x)) (< delta_y 0)) (setq ang (/ (* pi 3.0) 2.0)))
            (t (setq ang nil))
          )

          (if ang
            (progn
              ;; 補助線の表示制御
              (if (= *DQ-EXT* "Yes")
                (progn (setvar "DIMSE1" 0) (setvar "DIMSE2" 0)) 
                (progn 
                  (setvar "DIMSE1" 1) (setvar "DIMSE2" 1)
                  (setq ext_pt (polar base_pt ang *DQ-DIST*))
                  (setq dim_loc base_pt)
                )
              )

              ;; 寸法作図実行
              (command "._DIMLINEAR" "_non" base_pt "_non" ext_pt "_non" dim_loc)
              
              ;; 値を強制的に保持された数値に上書き
              (entmod (subst (cons 1 (rtos *DQ-DIST* 2 4)) (assoc 1 (entget (entlast))) (entget (entlast))))
            )
          )
        )
      )
    )
  )

  ;; --- 終了処理 ---
  (if (and vars vals) (mapcar 'setvar vars vals))
  (vla-endundomark (vla-get-activedocument (vlax-get-acad-object)))
  (princ)
)

(defun C:DQ () (C:DIMQUICK))
(princ)