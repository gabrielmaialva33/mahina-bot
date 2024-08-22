#!/usr/bin/env bash
# Use this script to test if a given TCP host/port are available

TIMEOUT=15
QUIET=0
EXIT_CODE=1

usage() {
  cat << USAGE >&2
Usage:
  $0 host:port [-t timeout] [-- command args]
  -q | --quiet                        Do not output any status messages
  -t TIMEOUT | --timeout=timeout      Timeout in seconds, zero for no timeout
  -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
  exit 1
}

wait_for() {
  for i in `seq $TIMEOUT` ; do
    nc -z "$HOST" "$PORT" > /dev/null 2>&1
    result=$?
    if [ $result -eq 0 ] ; then
      if [ $QUIET -ne 1 ] ; then
        echo "$HOST:$PORT is available after $i seconds."
      fi
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_wrapper() {
  # In order to support SIGINT during timeout: http://unix.stackexchange.com/a/57692
  if [ $QUIET -ne 1 ] ; then
    echo "Waiting for $HOST:$PORT..."
  fi
  wait_for
  result=$?
  if [ $result -ne 0 ] ; then
    if [ $QUIET -ne 1 ] ; then
      echo "Timeout occurred after waiting $TIMEOUT seconds for $HOST:$PORT."
    fi
    exit $EXIT_CODE
  fi
  if [ $# -gt 0 ] ; then
    exec "$@"
  fi
  exit 0
}

while [ $# -gt 0 ]
do
  case "$1" in
    *:* )
    HOST=$(printf "%s\n" "$1"| cut -d : -f 1)
    PORT=$(printf "%s\n" "$1"| cut -d : -f 2)
    shift 1
    ;;
    -q | --quiet)
    QUIET=1
    shift 1
    ;;
    -t)
    TIMEOUT="$2"
    if [ "$TIMEOUT" = "" ] ; then break ; fi
    shift 2
    ;;
    --timeout=*)
    TIMEOUT="${1#*=}"
    shift 1
    ;;
    --)
    shift
    break
    ;;
    -*)
    usage
    ;;
    *)
    break
    ;;
  esac
done

if [ "$HOST" = "" -o "$PORT" = "" ]; then
  usage
fi

wait_for_wrapper "$@"

