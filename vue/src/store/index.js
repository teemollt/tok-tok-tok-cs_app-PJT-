import { createStore } from 'vuex'
import axios from 'axios'
import Stomp from "webstomp-client"
import SockJS from "sockjs-client"

export default createStore({
  state: {
    user_idx: 1,
    rooms: [],
    selected_room: null, // 더블클릭한 채팅방의 세션id를 저장
    // chat
    chats: {},
    sessionId: "",
    roomName: "",
    messages: { messageArrayKey: [] },
    message: "",
    session_pk: 0,
    connected: false,
    stompClient: null,
    userName: 1,
    realMsg: [],
  },
  mutations: {
    GET_ROOMS(state, payload) {
      state.rooms = payload
      // console.log(payload)
    },
    ADD_ROOMS(state, payload) {
      state.rooms.push(payload)
    },
    PICK_ROOM(state, payload) {
      state.selected_room = payload
      console.log(payload)
    },
    CHAT_INIT(state, payload) {
      state.chats = payload
      console.log('init 실행 아래 내용이 chats에 들어간다')
      console.log(payload)
    },
    GET_ROOM_DETAIL(state, payload) {
      state.roomName = payload.roomName
      state.messages.messageArrayKey = payload.messageArrayKey
      console.log("찍혀랏!")
    },
    GET_MSG(state, payload) {
      state.realMsg = payload
    }
  },
  actions: {
    async getChatRooms({ commit, state }) {
      try {
        const res = await axios.get(`http://localhost:8088/temp/api/chat/rooms/user/${state.user_idx}`)
        console.log(res.data)
        commit('GET_ROOMS', res.data)
      } catch (error) {
        console.log(error)
      }
    },
    async createChatRooms({ commit }) {
      try {
        const res = await axios.post('http://localhost:8088/temp/api/chat/room', {
          unread: 0,
          fk_created_by_idx: 1, // 상담 신청하는 고객의 userid
          fk_client_idx: 1, // 위 필드와 동일값 넣어주면 됨.
        })
        console.log(res.data)
        commit('ADD_ROOMS', res.data)
      } catch (error) {
        console.log(error)
        alert('채팅방 개설 실패')
      }
    },
    pickRoom({ commit }, key) {
      commit('PICK_ROOM', key)
    },
    async chatInit({ commit }) {
      try {
        const res = await axios.get("http://localhost:8088/temp/api/chat/admin/init", {})
        // console.log(res)
        // 여기서 전역 chats에 res.data 넣어줘야함
        commit('CHAT_INIT', res.data)
        // connect(sessionId) 커넥트 실시해줘야함.
        // connect(sessionId) 커넥트 정의해줘야지
      } catch (err) { console.log(err) }
    },
    sendMessage() {
      if (this.userName !== "" && this.message !== "") {
        this.send(this.message) // 전송 실패 감지는 어떻게? 프론트단에서 고민
      }
      this.message = ""
    },
    send() {
      if (this.stompClient && this.stompClient.connected) {
        const msg = {
          message: this.message, // 메세지 내용. type이 MSG인 경우를 제외하곤 비워두고 프론트단에서만 처리.
          fk_author_idx: 1, // 작성자의 회원 idx
          created: "", // 작성시간, 공란으로 비워서 메세지 보내기. response에는 담겨옵니다.
          deleted: false, // 삭제된 메세지 여부. default = false
          fk_session_id: this.sessionId, // 현재 채팅세션의 id.
          // 주의할 점은, 방 세션 id가 아닌, 방 정보의 pk_idx를 첨부한다. created 라이프사이클 메서드 참조.
          type: "MSG", // 메세지 타입.
        }
        this.stompClient.send("/receive/" + this.sessionId, JSON.stringify(msg), {})
      }
    },
    connect() {
      const serverURL = "http://localhost:8088/temp/chat" // 서버 채팅 주소
      let socket = new SockJS(serverURL)
      this.stompClient = Stomp.over(socket)
      console.log(`connecting to socket=> ${serverURL}`)
      this.stompClient.connect(
        {},
        (frame) => {
          this.connected = true
          console.log("status : established", frame)
          // 구독 == 채팅방 입장.
          this.stompClient.subscribe("/send/admin", (res) => { // 모든 메세지 수신
            // console.log("receive from server:", res.body)
            this.messages.messageArrayKey = JSON.parse(res.body) // 수신받은 메세지 표시하기
            switch (res.body.type) {
              case "MSG":
                break
              case "JOIN":
                // 방을 생성할 때 백엔드단에서 처리하므로 신경 x
                break
              case "QUIT":
                // 만약 둘 중 하나가 나가면 더 이상 채팅을 못치는 프론트구현
                break
              case "VID":
                // vid 시작시 -> 화상채팅 시작하기 버튼만 딸랑 띄우기
                break
              default:
                // 알수없는 오류...
                break
            }
          })
        },
        (error) => {
          // 소켓 연결 실패
          console.log("status : failed", error)
          this.connected = false
        }
      )
    },
    async getRoom({ commit, dispatch }, key) {
      try {
        console.log('액션' + key)
        const res = await axios.get("http://localhost:8088/temp/api/chat/room/" + key)
        // roomName = res.data.name
        const response = await axios.get("http://localhost:8088/temp/api/chat/messages/" + key)
        // messages.messageArrayKey = response.data
        commit('GET_ROOM_DETAIL', { roomName: res.data.name, messageArrayKey: response.data })

        dispatch('connect', key)
      } catch (err) {
        console.log(err)
      }
    },
    getMsg({ commit }, key) {
      commit('GET_MSG', key)
    }

  },
  getters: {
    get_msg: (state) => {
      console.log('이거찍히나' + state.chats[`${state.selected_room}`].messages[8].message)
      return state.realMsg = state.chats[`${state.selected_room}`].messages
    }
  }
})
