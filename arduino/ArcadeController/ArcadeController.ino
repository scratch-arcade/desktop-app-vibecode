#include <Keyboard.h>

const int JOY_X_PIN = A0;
const int JOY_Y_PIN = A1;
const int BTN_A_PIN = 2;
const int BTN_B_PIN = 3;

const int ANALOG_CENTER = 512;
const int DEADZONE = 170;
const int PRESS_THRESHOLD = 200;
const unsigned long REPEAT_MS = 90;

bool leftHeld = false;
bool rightHeld = false;
bool upHeld = false;
bool downHeld = false;
bool aHeld = false;
bool bHeld = false;

unsigned long lastRepeatAt = 0;

void setup() {
  pinMode(BTN_A_PIN, INPUT_PULLUP);
  pinMode(BTN_B_PIN, INPUT_PULLUP);
  Keyboard.begin();
}

void updateAxisKey(bool shouldHold, bool &isHeld, uint8_t keycode) {
  if (shouldHold && !isHeld) {
    Keyboard.press(keycode);
    isHeld = true;
    return;
  }
  if (!shouldHold && isHeld) {
    Keyboard.release(keycode);
    isHeld = false;
  }
}

void updateButtonKey(bool pressed, bool &isHeld, uint8_t keycode) {
  if (pressed && !isHeld) {
    Keyboard.press(keycode);
    isHeld = true;
    return;
  }
  if (!pressed && isHeld) {
    Keyboard.release(keycode);
    isHeld = false;
  }
}

void loop() {
  int x = analogRead(JOY_X_PIN);
  int y = analogRead(JOY_Y_PIN);

  int dx = x - ANALOG_CENTER;
  int dy = y - ANALOG_CENTER;

  bool leftNow = dx < -PRESS_THRESHOLD;
  bool rightNow = dx > PRESS_THRESHOLD;
  bool upNow = dy < -PRESS_THRESHOLD;
  bool downNow = dy > PRESS_THRESHOLD;

  if (abs(dx) < DEADZONE) {
    leftNow = false;
    rightNow = false;
  }
  if (abs(dy) < DEADZONE) {
    upNow = false;
    downNow = false;
  }

  updateAxisKey(leftNow, leftHeld, KEY_LEFT_ARROW);
  updateAxisKey(rightNow, rightHeld, KEY_RIGHT_ARROW);
  updateAxisKey(upNow, upHeld, KEY_UP_ARROW);
  updateAxisKey(downNow, downHeld, KEY_DOWN_ARROW);

  bool aNow = digitalRead(BTN_A_PIN) == LOW;
  bool bNow = digitalRead(BTN_B_PIN) == LOW;

  updateButtonKey(aNow, aHeld, ' ');
  updateButtonKey(bNow, bHeld, KEY_RETURN);

  unsigned long now = millis();
  if (now - lastRepeatAt > REPEAT_MS) {
    lastRepeatAt = now;
  }

  delay(6);
}
