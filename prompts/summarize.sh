function _summarize_yt {
  echo "Get Video Title..."
  export DATE=$(date -u '+%Y%m%d.%H%M%S')
  echo "Date: $DATE"
  export TITLE_VIDEO=$DATE.$(yt-dlp -q --no-warnings -e $1 | jq -sRr @uri)
  echo $TITLE_VIDEO
  export TITLE_VIDEO_SRT="$TITLE_VIDEO.%(ext)s"
  echo "Getting transcript..."
  yt-dlp -q --no-warnings --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format ttml --convert-subs srt --output $TITLE_VIDEO_SRT $1
  echo "Summarizing with gemini"
  SUMMARIZATION_PROMPT="Please summarize in maximum detail this transcript: "
  gemini -p "SUMMARIZATION_PROMPT @$TITLE_VIDEO.en.srt" > $TITLE_VIDEO.summary.md
  rm -f $TITLE_VIDEO.en.srt
  rm -f $TITLE_VIDEO.txt.en.srt
}

function _summarize_pdf {
  export DATE=$(date -u '+%Y%m%d.%H%M%S')
  export FINAL_FILE=$DATE.$(basename $1)
  echo "Generating summary..."
  SUMMARIZATION_PROMPT="Please summarize in maximum detail this pdf:"
  gemini -p "$SUMMARIZATION_PROMPT \"@$1\"" > $FINAL_FILE.md
  echo "Generated: $FINAL_FILE"
}

alias summarize_yt=_summarize_yt
alias summarize_pdf=_summarize_pdf


