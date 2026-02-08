import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 300,
          gestureEnabled: true,
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: "none",
          }}
        />
        <Stack.Screen
          name="splash"
          options={{
            animation: "fade",
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="welcome"
          options={{
            animation: "fade",
            animationDuration: 400,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: "slide_from_bottom",
            animationDuration: 350,
          }}
        />
        <Stack.Screen
          name="results"
          options={{
            animation: "slide_from_bottom",
            animationDuration: 400,
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            animation: "slide_from_right",
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            animation: "slide_from_right",
            animationDuration: 300,
          }}
        />
      </Stack>
    </>
  );
}
