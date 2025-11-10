function _summarize_yt {
  echo "Get Video Title..."
  export DATE=$(date -u '+%Y%m%d')
  echo "Date: $DATE"
  export TITLE_VIDEO=$DATE.$(yt-dlp -q --no-warnings -e $1 | jq -sRr @uri)
  echo $TITLE_VIDEO
  export TITLE_VIDEO_SRT="$TITLE_VIDEO.%(ext)s"

  if [ -f "$TITLE_VIDEO.summary.md" ] && [ -s "$TITLE_VIDEO.summary.md" ]; then
    echo "Summary file already exists: $TITLE_VIDEO.summary.md"
    return 0
  fi

  echo "Getting transcript..."
  yt-dlp -q --no-warnings --skip-download --write-subs --write-auto-subs --sub-lang en --sub-format ttml --convert-subs srt --output $TITLE_VIDEO_SRT $1
  echo "Summarizing with gemini"
  SUMMARIZATION_PROMPT="Please summarize in maximum detail this transcript: @$TITLE_VIDEO.en.srt"
  gemini -p $SUMMARIZATION_PROMPT > $TITLE_VIDEO.summary.md

  if [ ! -s "$TITLE_VIDEO.summary.md" ]; then
    echo "Error: Failed to generate summary or summary file is empty."
    # Keep the transcript file for debugging
    echo "Transcript preserved at: $TITLE_VIDEO.en.srt"
    return 1
  fi

  rm -f $TITLE_VIDEO.en.srt
  rm -f $TITLE_VIDEO.txt.en.srt
}

function _summarize_pdf {
  export DATE=$(date -u '+%Y%m%d')
  export FINAL_FILE=$DATE.$(basename $1)
  echo "Generating summary..."
  SUMMARIZATION_PROMPT="Please summarize in maximum detail this pdf: \"@$1\""

  if [ -f "$FINAL_FILE.md" ] && [ -s "$FINAL_FILE.md" ]; then
    echo "Summary file already exists: $FINAL_FILE.md"
    return 0
  fi

  gemini -p $SUMMARIZATION_PROMPT > $FINAL_FILE.md
  echo "Generated: $FINAL_FILE.md"
}


function _summarize_pdf_lmstudio(){
  # Check if at least one argument is provided
  if [[ $# -eq 0 ]]; then
    echo "Error: Please provide the file to summarize"
    return 1
  fi

  DATE=$(date -u '+%Y%m%d.%H%M%S')

  INPUT=$(cat $1 | jq -sR @json)
  model_name="qwen2.5"
  model_slug="lmstudio-community/Qwen2.5-14B-Instruct-1M-GGUF"
  model_slug="lmstudio-community/Qwen2.5-7B-Instruct-1M-GGUF"
  export LANG=en_US.UTF-8
  echo "Pair: $model_name and $model_slug"
  OUTPUT="$DATE.$model_name.md"
  echo $INPUT
  curl http://localhost:1234/v1/chat/completions \
        -H "Content-Type: application/json" \
        -d "{
        \"model\": \"$model_slug\",
        \"messages\": [
            { \"role\": \"user\", \"content\": $INPUT }
        ]}" \
        -o $OUTPUT.tmp
  cat $OUTPUT.tmp |jq -r '.choices.[0].message.content' > $OUTPUT
  # rm $OUTPUT.tmp

  if [[ -n "${AI_BACKUP_PR_FOLDER}" ]]; then
      mv "$OUTPUT" "$AI_BACKUP_PR_FOLDER"
  fi
}

function _summarize_pdf_openrouter(){
  # Check if at least one argument is provided
  if [[ $# -eq 0 ]]; then
    echo "Error: Please provide the file to summarize"
    return 1
  fi

  DATE=$(date -u '+%Y%m%d.%H%M%S')

  INPUT=$(cat $1 "Please provide a summary for each chapter of the text above, chapter per chapter and with maximum detail"  | jq -sR @json)
  model_name=$SUMMARIZE_PDF_MODEL_NAME
  model_slug=$SUMMARIZE_PDF_MODEL_SLUG
  export LANG=en_US.UTF-8
  echo "Pair: $model_name and $model_slug"
  OUTPUT=$DATE.$(basename $1).$model_name.md
  curl https://openrouter.ai/api/v1/chat/completions \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
        \"model\": \"$model_slug\",
        \"messages\": [
            { \"role\": \"user\", \"content\": $INPUT }
        ], \"temperature\": 0 }" \
        -o $OUTPUT.tmp
  cat $OUTPUT.tmp |jq -r '.choices.[0].message.content' > $OUTPUT
  # rm $OUTPUT.tmp
}

alias summarize_yt=_summarize_yt
alias summarize_pdf=_summarize_pdf
alias summarize_pdf_lmstudio=_summarize_pdf_lmstudio
alias summarize_pdf_openrouter=_summarize_pdf_openrouter





