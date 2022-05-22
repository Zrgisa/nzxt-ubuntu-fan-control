#!/usr/bin/env bash

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

if [ ! -d "config.json" ]
then
  cp -p config-sample.json config.json
fi

if [ ! -d "/usr/local/bin/fan-control" ]
then
  mkdir "/usr/local/bin/fan-control"
fi

cp config.json /usr/local/bin/fan-control/config.json
cp fan-control.js /usr/local/bin/fan-control/fan-control.js
cp fan-control.service /etc/systemd/system/fan-control.service

systemctl daemon-reload
systemctl restart fan-control
systemctl enable fan-control