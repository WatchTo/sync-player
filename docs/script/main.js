const App = new Vue({
  el: '#app',
  template: '#template',
  data: {
    inviteLink: null,
    socket: null,
    player: null,
    roomKeeper: localStorage.getItem('roomKeeper') ? localStorage.getItem('roomKeeper') : null,
    options: {
      autoplay: 'play',
      controls: true,
      muted: false,
      bigPlayButton: false,
      textTrackDisplay: false,
      posterImage: false,
      errorDisplay: false,
      noUITitleAttributes: true,
      fullscreen: {
        options: { navigationUI: 'hide' }
      },
      hls: {
        withCredentials: true
      }
    },
    playing: false,
    goEasyConnect: null,
    videoList: [],
    videoSrc: 'http://192.168.3.58:8088/movie/Better.Call.Saul.S05E08.mp4',
    playing: false,
    controlParam: {
      user: '',
      action: '',
      content: '',
    },
    userId: '',
    // goEasy 添加以下变量
    channel: 'channel1', // GoEasy channel
    appkey: '******', // GoEasy应用appkey，替换成你的appkey

    // leancloud-realtime 添加以下变量，appId、appKey、server这几个值去leancloud控制台>设置>应用凭证里面找
    chatRoom: null,
    appId: '*******************',
    appKey: '*******************',
    server: 'https://*******************.***.com', // REST API 服务器地址

    urlParams: null,
  },
  methods: {
    async doCopy(userId){
      if(window.location.href.indexOf('?') != -1){
        this.inviteLink = window.location.href.substring(0, window.location.href.indexOf('?'))
      }else{
        this.inviteLink = window.location.href;
      }
      this.inviteLink += '?room=';
      this.inviteLink += userId;
      navigator.clipboard.writeText(this.inviteLink);
      alert("复制完成");
    },
    randomString(length) {
      let str = ''
      for (let i = 0; i < length; i++) {
        str += Math.random().toString(36).substr(2)
      }
      return str.substr(0, length)
    },
    setRoomKeeper() {
      localStorage.setItem('roomKeeper', this.roomKeeper);
    },
    addVideo() {
      if (this.videoSrc) {
        this.videoList.push(decodeURI(this.videoSrc))
      }
      this.controlParam.action = "addVideo";
      this.controlParam.content = decodeURI(this.videoSrc);
      this.sendMessage(this.controlParam);
      localStorage.setItem('videoList', JSON.stringify(this.videoList))
    },
    playVideoItem(path) {
      this.player.src({
        src: path,
      })
      this.controlParam.action = "switch";
      this.controlParam.content = path;
      this.sendMessage(this.controlParam);
      localStorage.setItem('currentPlayVideo', src)
    },
    deleteVideoItem(index) {
      this.videoList.splice(index, 1)
      this.controlParam.action = "deleteVideo";
      this.controlParam.content = index;
      this.sendMessage(this.controlParam);
      localStorage.setItem('videoList', JSON.stringify(this.videoList))
    },
    seekVideo() {
      this.player.pause()
      this.controlParam.action = 'seek'
      this.controlParam.time = this.player.currentTime
      this.sendMessage(this.controlParam)
    },
    sendMessage(controlParam) {
      const params = JSON.stringify(controlParam)

      // 使用socket-io
      this.socket.emit('video-control', params)

      // 使用GoEasy
      // this.goEasyConnect.publish({
      //   channel: this.channel,
      //   message: params
      // })

      // 使用leancloud-realtime
      // this.chatRoom.send(new TextMessage(params))
    },
    resultHandler(result) {
      // 只有绑定了房主 并且 收到房主消息才会执行操作
      if (this.roomKeeper && result.user == this.roomKeeper) {
        switch (result.action) {
          case "play":
            if (this.player.currentSrc() != result.content) {
              this.player.src({
                src: result.content,
              })
            }
            this.player.play();
            this.player.currentTime(result.time + 0.2) //播放时+0.2秒，抵消网络延迟
            break
          case "pause":
            if (this.player.currentSrc() != result.content) {
              this.player.src({
                src: result.content,
              })
            }
            this.player.pause();
            this.player.currentTime(result.time)
            break
          case "seek":
            if (this.player.currentSrc() != result.content) {
              this.player.src({
                src: result.content,
              })
            }
            this.player.currentTime(result.time);
            this.player.play();
            break
          case "addVideo":
            this.videoList.push(result.content);
            break
          case "deleteVideo":
            this.videoList.splice(result.content, 1)
            break
          case "switch":
            this.player.src({
              src: result.content,
            })
            break
        }
      }
    }
  },
  created() {

    /* 读取本地视频列表和上一次播放的视频*/

    const localList = JSON.parse(localStorage.getItem('videoList'))

    this.videoList = localList ? localList : []

    const currentPlayVideo = localStorage.getItem('currentPlayVideo')

    this.videoSrc = currentPlayVideo ? currentPlayVideo : ''

    this.userId = localStorage.getItem('userId')
    this.userId = this.userId ? this.userId : this.randomString(10);
    localStorage.setItem('userId', this.userId);

    this.urlParams = new URLSearchParams(window.location.search);
    this.room = this.urlParams.get("room");
    if(this.room){
      this.roomKeeper = this.room;
    }

    this.controlParam.user = this.userId
  },
  mounted() {

    this.player = videojs("video", {controls: true});

    this.player.on("pause", () => {
      this.playing = false;
      this.controlParam.action = 'pause';
      this.controlParam.content = this.player.currentSrc();
      this.controlParam.time = this.player.currentTime();
      this.sendMessage(this.controlParam);
    })

    this.player.on("play", () => {
      this.playing = true;
      this.controlParam.action = 'play';
      this.controlParam.content = this.player.currentSrc();
      this.controlParam.time = this.player.currentTime()
      this.sendMessage(this.controlParam)
    })

    this.player.on("ended", () => {

    })

    /*使用socket-io*/
    this.socket = io('https://api.cblueu.cn:2233',
      {
        withCredentials: true,
        extraHeaders: {
        }
      }
    ); // 替换成你的websocket服务地址
    this.socket.on('video-control', (res) => {
      const result = JSON.parse(res);
      console.log(result);
      if (result.user !== this.userId) {
        this.resultHandler(result)
      }
    });

    
    
    /* 使用GoEasy*/

    // /* 创建GoEasy连接*/
    // this.goEasyConnect = new GoEasy({
    //   host: "hangzhou.goeasy.io", // 应用所在的区域地址，杭州：hangzhou.goeasy.io，新加坡：singapore.goeasy.io
    //   appkey: this.appkey,
    //   onConnected: function () {
    //     console.log('连接成功！')
    //   },
    //   onDisconnected: function () {
    //     console.log('连接断开！')
    //   },
    //   onConnectFailed: function (error) {
    //     console.log(error, '连接失败或错误！')
    //   }
    // })
    //
    const that = this
    //
    // /* 监听GoEasy连接*/
    // this.goEasyConnect.subscribe({
    //   channel: this.channel,
    //   onMessage: function (message) {
    //     const result = JSON.parse(message.content)
    //     if (result.user !== that.userId) {
    //       that.resultHandler(result)
    //     }
    //   }
    // })

    // const realtime = new Realtime({
    //   appId: this.appId,
    //   appKey: this.appKey,
    //   server: this.server,
    // })

    //换成你自己的一个房间的 conversation id（这是服务器端生成的），第一次执行代码就会生成，在leancloud控制台>即时通讯>对话下面，复制一个过来即可

    // var roomId = '***********'

    // 每个客户端自定义的 id

    // var client, room

    // realtime.createIMClient(this.userId).then(function(c) {
    //   console.log('连接成功')
    //   client = c
    //   client.on('disconnect', function() {
    //     console.log('[disconnect] 服务器连接已断开')
    //   })
    //   client.on('offline', function() {
    //     console.log('[offline] 离线（网络连接已断开）')
    //   })
    //   client.on('online', function() {
    //     console.log('[online] 已恢复在线')
    //   })
    //   client.on('schedule', function(attempt, time) {
    //     console.log(
    //       '[schedule] ' +
    //       time / 1000 +
    //       's 后进行第 ' +
    //       (attempt + 1) +
    //       ' 次重连'
    //     )
    //   })
    //   client.on('retry', function(attempt) {
    //     console.log('[retry] 正在进行第 ' + (attempt + 1) + ' 次重连')
    //   })
    //   client.on('reconnect', function() {
    //     console.log('[reconnect] 重连成功')
    //   })
    //   client.on('reconnecterror', function() {
    //     console.log('[reconnecterror] 重连失败')
    //   })
    //   // 获取对话
    //   return c.getConversation(roomId)
    // })
    //   .then(function(conversation) {
    //     if (conversation) {
    //       return conversation
    //     } else {
    //       // 如果服务器端不存在这个 conversation
    //       console.log('不存在这个 conversation，创建一个。')
    //       return client
    //         .createConversation({
    //           name: 'LeanCloud-Conversation',
    //           // 创建暂态的聊天室（暂态聊天室支持无限人员聊天）
    //           transient: true,
    //         })
    //         .then(function(conversation) {
    //           console.log('创建新 Room 成功，id 是：', roomId)
    //           roomId = conversation.id
    //           return conversation
    //         })
    //     }
    //   })
    //   .then(function(conversation) {
    //     return conversation.join()
    //   })
    //   .then(function(conversation) {
    //     // 获取聊天历史
    //     room = conversation;
    //     that.chatRoom = conversation
    //     // 房间接受消息
    //     room.on('message', function(message) {
    //       const result = JSON.parse(message._lctext)
    //       that.resultHandler(result)
    //     });
    //   })
    //   .catch(function(err) {
    //     console.error(err);
    //     console.log('错误：' + err.message);
    //   });

    // this.player.addEventListener('play', () => {
    //   this.playing = true
    // })
    // this.player.addEventListener('pause', () => {
    //   this.playing = false
    // })
  }
})
