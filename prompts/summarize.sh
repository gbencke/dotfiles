function _summarize_yt {
  echo "Get Video Title..."
  export TITLE_VIDEO=$(yt-dlp -q --no-warnings -e $1 | jq -sRr @uri)
  echo $TITLE_VIDEO
  export TITLE_VIDEO_SRT="$TITLE_VIDEO.%(ext)s"
  echo "Getting transcript..."
  yt-dlp -q --no-warnings --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format ttml --convert-subs srt --output $TITLE_VIDEO_SRT $1
  echo "Summarizing with gemini"
  gemini -p "Please summarize in maximum detail this transcript: @$TITLE_VIDEO.en.srt" > $TITLE_VIDEO.summary.md
  rm -rf $TITLE_VIDEO.en.srt
  rm -rf $TITLE_VIDEO.txt.en.srt
}

function _summarize_pdf {
  export FINAL_FILE=$(basename $1)
  echo "Generating summary..."
  gemini -p "Please summarize in maximum detail this pdf: \"@$1\"" > $FINAL_FILE.md
  echo "Generated: $FINAL_FILE"
}

alias summarize_yt=_summarize_yt
alias summarize_pdf=_summarize_pdf


