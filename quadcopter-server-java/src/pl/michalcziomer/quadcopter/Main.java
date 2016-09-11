package pl.michalcziomer.quadcopter;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.ServerSocket;
import java.net.Socket;

public class Main {

    private static int quadcopterPort = 9999;

    public static void main(String[] args) {
        log("Quadcopter: creating socket... @" + quadcopterPort);

        ServerSocket sSocket = null;
        String received, sent;
        DataInputStream iStream;
        PrintStream oStream;
        Socket cSocket = null;

        try {
            sSocket = new ServerSocket(quadcopterPort);
            log("Quadcopter: socket created!!! @" + quadcopterPort);
        } catch (IOException e) {
            log("Quadcopter: failed to create socket. @" + quadcopterPort);
            return;
        }


        try {
            log("Quadcopter: waiting for connection...");
            cSocket = sSocket.accept();
            iStream = new DataInputStream(cSocket.getInputStream());
            oStream = new PrintStream(cSocket.getOutputStream());

            log("Quadcopter: connection established @" + quadcopterPort);
            while (true) {
                received = listen( iStream );
                log( "Segway: " + received );
                say( "You said '" + received + "'.", oStream );
            }
        } catch (Exception e) {
            log("Connection terminated. Segway no longer available.");
        }
    }

    private static void log(String data) {
        System.out.println( data );
    }

    private static void say(String data, PrintStream oStream) {
        oStream.println( data );
    }

    private static String listen(DataInputStream iStream) throws IOException {
        String response = iStream.readLine();
        return response;
    }
}