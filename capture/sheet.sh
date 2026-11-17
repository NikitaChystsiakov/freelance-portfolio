#!/bin/zsh
# контактный лист видео: кадр каждые 2 с, сетка 4x3
id=$1; mkdir -p sheets
ffmpeg -v error -y -i raw/$id.webm -vf "fps=1/2,scale=320:-1,tile=4x3:padding=4" -frames:v 1 sheets/$id.jpg
