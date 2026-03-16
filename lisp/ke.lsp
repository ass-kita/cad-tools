(defun C:BLARRAY (/ ss n i ent obj blk_name block_list sorted_blocks unique_blocks 
                   previous_name start_point direction distance current_point copied_obj)
  (vl-load-com)
  (setq block_list '())

  ;; 1. ブロックの選択
  (princ "\n整列するブロックを選択 (Enterで終了): ")
  (if (setq ss (ssget '((0 . "INSERT"))))
    (progn
      (setq n (sslength ss) i 0)
      (repeat n
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))
        (setq block_list (cons (list (vla-get-Name obj) obj) block_list))
        (vla-highlight obj :vlax-true) ; 選択中をハイライト
        (setq i (1+ i))
      )

      ;; 2. ブロック名順にソートして重複削除
      (setq sorted_blocks (vl-sort block_list '(lambda (a b) (< (car a) (car b)))))
      (setq unique_blocks '() previous_name nil)
      (foreach item sorted_blocks
        (if (/= (car item) previous_name)
          (setq unique_blocks (cons item unique_blocks))
        )
        (setq previous_name (car item))
      )
      (setq unique_blocks (reverse unique_blocks))

      ;; 3. 配置設定
      (initget 1)
      (setq start_point (getpoint "\n整列の開始基準点を指定: "))
      (initget "Y X")
      (setq direction (getkword "\n整列方向を選択 [縦(Y)/横(X)] <Y>: "))
      (if (not direction) (setq direction "Y"))
      
      (initget 1)
      (setq distance (getdist start_point (strcat "\n整列間隔 (" direction ") を指定: ")))

      ;; 4. 配置実行 (ActiveX方式でOSNAP無視)
      (setq current_point (vlax-3d-point start_point))
      (setq modelSpace (vla-get-ModelSpace (vla-get-ActiveDocument (vlax-get-acad-object))))
      
      (foreach item unique_blocks
        (setq obj (cadr item))
        ;; ブロックを同じ場所にコピー
        (setq copied_obj (vla-copy obj))
        ;; 新しい座標へ移動
        (vla-put-InsertionPoint copied_obj current_point)
        
        ;; 次の座標計算
        (setq start_point (if (= direction "Y")
                            (polar start_point (/ pi -2.0) distance) ; 下方向
                            (polar start_point 0.0 distance)         ; 右方向
                          ))
        (setq current_point (vlax-3d-point start_point))
      )
      
      ;; ハイライト解除
      (foreach item block_list (vla-highlight (cadr item) :vlax-false))
      (princ (strcat "\n" (itoa (length unique_blocks)) " 個のユニークブロックを配置しました。"))
    )
    (princ "\nブロックが選択されませんでした。")
  )
  (princ)
)
